import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "OPENAI_API_KEY secret is missing" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const body = await req.json();
    if (typeof body?.imagePrompt === "string" && body.imagePrompt.trim()) {
      const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-1",
          prompt: body.imagePrompt.trim().slice(0, 1800),
          size: "1024x1024",
          n: 1
        })
      });
      const imageResult = await imageResponse.json();
      if (!imageResponse.ok) {
        console.error("OpenAI image error", imageResponse.status, imageResult?.error?.code || "unknown");
        return new Response(JSON.stringify({ error: "Image generation failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const image = imageResult?.data?.[0];
      if (image?.b64_json) return new Response(JSON.stringify({ imageUrl: `data:image/png;base64,${image.b64_json}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (image?.url) return new Response(JSON.stringify({ imageUrl: image.url }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Image provider returned no image" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const safeMessages = messages
      .filter((m: any) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .slice(-20)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 6000) }));
    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
      return new Response(JSON.stringify({ error: "A user message is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are Vyro's helpful, respectful Persian-first assistant. Reply in the language the user uses. Be clear and concise. Do not claim to have performed actions you cannot perform." },
          ...safeMessages
        ],
        temperature: 0.7,
        max_tokens: 900
      })
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("OpenAI API error", response.status, result?.error?.code || result?.error?.type || "unknown");
      return new Response(JSON.stringify({ error: "AI provider request failed", status: response.status }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const answer = result?.choices?.[0]?.message?.content;
    if (typeof answer !== "string") throw new Error("AI provider returned an empty response");
    return new Response(JSON.stringify({ answer }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("vyro-ai error", error);
    return new Response(JSON.stringify({ error: "Unexpected AI function error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
