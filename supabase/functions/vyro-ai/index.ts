import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function endpoint(base: string, path: string) {
  return base.replace(/\\/+$/, "") + path;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const requestedTier = typeof body?.tier === "string" ? body.tier : "free";
    const allowedTiers = ["free", "pro", "proplus"];
    if (!allowedTiers.includes(requestedTier)) return json({ error: "Invalid AI tier" }, 400);

    // The selected tier is never trusted by itself: paid access must be confirmed from Supabase Auth metadata.
    if (requestedTier !== "free") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (!token || !supabaseUrl || !anonKey) return json({ error: "Paid subscription is not active", code: "TIER_NOT_ACTIVE" }, 402);
      const userResponse = await fetch(endpoint(supabaseUrl, "/auth/v1/user"), {
        headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
      });
      const user = userResponse.ok ? await userResponse.json() : null;
      if (user?.app_metadata?.vyro_tier !== requestedTier) {
        return json({ error: "This paid AI tier is not active for your account", code: "TIER_NOT_ACTIVE" }, 402);
      }
    }

    // Use a self-hosted or independently chosen OpenAI-compatible inference server.
    // No OpenAI API key or OpenAI endpoint is assumed.
    const baseUrl = Deno.env.get("VYRO_AI_BASE_URL");
    const apiKey = Deno.env.get("VYRO_AI_API_KEY");
    if (!baseUrl) {
      return json({
        error: "AI engine is not configured",
        code: "AI_ENGINE_NOT_CONFIGURED",
        message: "Set VYRO_AI_BASE_URL to a reachable self-hosted or third-party compatible inference endpoint.",
      }, 503);
    }

    if (typeof body?.imagePrompt === "string" && body.imagePrompt.trim()) {
      const imageUrl = Deno.env.get("VYRO_IMAGE_API_URL");
      if (!imageUrl) return json({
        error: "Image generation is not configured",
        code: "IMAGE_ENGINE_NOT_CONFIGURED",
        message: "A separate image-generation service must be configured; chat-model access alone cannot generate images.",
      }, 503);
      const imageHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) imageHeaders.Authorization = `Bearer ${apiKey}`;
      const imageResponse = await fetch(imageUrl, {
        method: "POST",
        headers: imageHeaders,
        body: JSON.stringify({
          model: Deno.env.get("VYRO_IMAGE_MODEL") || "default",
          prompt: body.imagePrompt.trim().slice(0, 1800),
          size: "1024x1024",
          n: 1,
        }),
      });
      const imageResult = await imageResponse.json();
      if (!imageResponse.ok) return json({ error: "Image generation failed" }, 502);
      const image = imageResult?.data?.[0];
      if (image?.b64_json) return json({ imageUrl: `data:image/png;base64,${image.b64_json}` });
      if (image?.url) return json({ imageUrl: image.url });
      if (typeof imageResult?.imageUrl === "string") return json({ imageUrl: imageResult.imageUrl });
      return json({ error: "Image provider returned no image" }, 502);
    }

    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const safeMessages = messages
      .filter((m: any) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .slice(-20)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 6000) }));
    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
      return json({ error: "A user message is required" }, 400);
    }

    const modelEnv = requestedTier === "proplus" ? "VYRO_PROPLUS_MODEL" : requestedTier === "pro" ? "VYRO_PRO_MODEL" : "VYRO_FREE_MODEL";
    const model = Deno.env.get(modelEnv) || Deno.env.get("VYRO_DEFAULT_MODEL") || "llama3.1";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const response = await fetch(endpoint(baseUrl, "/chat/completions"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are Vyro's helpful, respectful Persian-first assistant. Reply in the language the user uses. Be clear and concise. Do not claim to have performed actions you cannot perform." },
          ...safeMessages,
        ],
        temperature: 0.7,
        max_tokens: requestedTier === "proplus" ? 1800 : requestedTier === "pro" ? 1200 : 700,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Vyro inference provider error", response.status);
      return json({ error: "AI provider request failed", status: response.status }, 502);
    }
    const answer = result?.choices?.[0]?.message?.content;
    if (typeof answer !== "string") throw new Error("AI provider returned an empty response");
    return json({ answer });
  } catch (error) {
    console.error("vyro-ai error", error);
    return json({ error: "Unexpected AI function error" }, 500);
  }
});
