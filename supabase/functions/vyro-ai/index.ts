import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  const authorization = req.headers.get("Authorization") || "";
  const publishableKey = req.headers.get("apikey") || "";
  if (!authorization.startsWith("Bearer ") || !publishableKey) return new Response(JSON.stringify({ error: "ورود به حساب وایرو لازم است." }), {
    status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    const payload = await req.json();
    const upstream = await fetch("https://vyro-ai-engine.vyro-social.workers.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": authorization, "apikey": publishableKey },
      body: JSON.stringify(payload),
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": upstream.headers.get("Content-Type") || "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Independent Vyro AI proxy error", error);
    return new Response(JSON.stringify({ error: "موتور مستقل وایرو موقتاً پاسخ نداد." }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});