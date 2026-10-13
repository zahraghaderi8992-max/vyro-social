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
