import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function configuredUrl(name: string): URL | null {
  const raw = Deno.env.get(name)?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

function withPath(base: URL, path: string): string {
  const url = new URL(base.toString());
  const basePath = url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  url.pathname = `${basePath}/${cleanPath}`;
  url.search = "";
  return url.toString();
}

function providerHeaders(tokenName: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = Deno.env.get(tokenName)?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function authorizeTier(req: Request, tier: string): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  let publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (publishableKeysRaw) {
    try {
      const parsed = JSON.parse(publishableKeysRaw);
      publishableKey = parsed?.default || publishableKey;
    } catch {
      // Fall back to the legacy anon key for projects not migrated yet.
    }
  }
  if (!token || !supabaseUrl || !publishableKey) return false;
  const authUrl = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl;
  const response = await fetch(`${authUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: publishableKey },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return false;
  const user = await response.json();
  if (!user?.id) return false;
  if (tier === "free") return true;
  // Authorization uses app_metadata only; user-editable user_metadata is never trusted.
  return user?.app_metadata?.vyro_tier === tier;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const tier = typeof body?.tier === "string" ? body.tier : "free";
    if (!["free", "pro", "proplus"].includes(tier)) return json({ error: "Invalid AI tier" }, 400);
    if (!(await authorizeTier(req, tier))) {
      return json({ error: "This AI tier is not active for your account", code: "TIER_NOT_ACTIVE" }, 402);
    }

    const ollamaUrl = configuredUrl("VYRO_OLLAMA_URL");
    const timeoutMs = Math.min(Math.max(Number(Deno.env.get("VYRO_AI_TIMEOUT_MS") || 90000), 10000), 180000);

    // Image generation uses a separate self-hosted AUTOMATIC1111/Forge-compatible server.
    // No OpenAI SDK, OpenAI endpoint, or OpenAI API key is used.
    if (typeof body?.imagePrompt === "string" && body.imagePrompt.trim()) {
      const imageUrl = configuredUrl("VYRO_IMAGE_ENGINE_URL");
      if (!imageUrl) {
        return json({
          error: "Image engine is not configured",
          code: "IMAGE_ENGINE_NOT_CONFIGURED",
          message: "Configure a reachable Stable Diffusion WebUI/Forge server before enabling image generation.",
        }, 503);
      }
      const response = await fetch(withPath(imageUrl, "sdapi/v1/txt2img"), {
        method: "POST",
        headers: providerHeaders("VYRO_IMAGE_ENGINE_TOKEN"),
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          prompt: body.imagePrompt.trim().slice(0, 1800),
          negative_prompt: "low quality, blurry, distorted, watermark, unreadable text",
          steps: 24,
          width: 768,
          height: 768,
          cfg_scale: 6.5,
          batch_size: 1,
        }),
      });
      if (!response.ok) {
        console.error("Vyro image engine failed", response.status);
        return json({ error: "Image engine request failed", code: "IMAGE_ENGINE_ERROR" }, 502);
      }
      const result = await response.json();
      const image = result?.images?.[0];
      if (typeof image !== "string" || !image) {
        return json({ error: "Image engine returned no image", code: "IMAGE_EMPTY" }, 502);
      }
      return json({ imageUrl: image.startsWith("data:") ? image : `data:image/png;base64,${image}` });
    }

    if (!ollamaUrl) {
      return json({
        error: "Vyro's independent AI engine is not configured",
        code: "AI_ENGINE_NOT_CONFIGURED",
        message: "Set VYRO_OLLAMA_URL to a reachable Ollama server. No OpenAI key is required.",
      }, 503);
    }

    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    const messages: ChatMessage[] = incoming
      .filter((message: any) => message && ["user", "assistant"].includes(message.role) && typeof message.content === "string")
      .slice(-20)
      .map((message: any) => ({ role: message.role, content: message.content.slice(0, 6000) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return json({ error: "A user message is required", code: "INVALID_MESSAGES" }, 400);
    }

    const modelEnv = tier === "proplus" ? "VYRO_PROPLUS_MODEL" : tier === "pro" ? "VYRO_PRO_MODEL" : "VYRO_FREE_MODEL";
    const model = Deno.env.get(modelEnv)?.trim() || Deno.env.get("VYRO_DEFAULT_MODEL")?.trim() || "qwen2.5:7b";
    const response = await fetch(withPath(ollamaUrl, "api/chat"), {
      method: "POST",
      headers: providerHeaders("VYRO_OLLAMA_TOKEN"),
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content: "تو دستیار هوشمند وایرو هستی. زبان پیش‌فرضت فارسی است اما همیشه به زبان کاربر پاسخ بده. پاسخ دقیق، روشن، محترمانه و کاربردی بده. اگر پاسخ را نمی‌دانی صادقانه بگو. ادعای انجام کار یا دسترسی به اطلاعات زنده‌ای که نداری نکن. اطلاعات حساس کاربر را درخواست نکن.",
          },
          ...messages,
        ],
        options: {
          temperature: 0.7,
          num_predict: tier === "proplus" ? 1800 : tier === "pro" ? 1200 : 800,
        },
        keep_alive: "10m",
      }),
    });

    if (!response.ok) {
      console.error("Vyro Ollama engine error", response.status);
      return json({
        error: "The independent AI model could not complete the request",
        code: "AI_MODEL_ERROR",
        status: response.status,
      }, 502);
    }
    const result = await response.json();
    const answer = result?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return json({ error: "The model returned an empty answer", code: "AI_EMPTY_RESPONSE" }, 502);
    }
    return json({ answer: answer.trim(), model, provider: "ollama" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const timedOut = message.toLowerCase().includes("timeout") || message.toLowerCase().includes("aborted");
    console.error("vyro-ai error", timedOut ? "timeout" : message);
    return json({
      error: timedOut ? "The AI model took too long to respond" : "Unexpected Vyro AI engine error",
      code: timedOut ? "AI_TIMEOUT" : "AI_ENGINE_ERROR",
    }, timedOut ? 504 : 500);
  }
});
