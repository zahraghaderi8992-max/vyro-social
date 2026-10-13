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
    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    if (!clientId || !clientSecret) return new Response(JSON.stringify({ error: "Spotify client secrets are missing" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const body = await req.json();
    const query = typeof body?.query === "string" ? body.query.trim().slice(0, 160) : "";
    if (!query) return new Response(JSON.stringify({ tracks: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(clientId + ":" + clientSecret),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error("Spotify token request failed");
    const searchResponse = await fetch("https://api.spotify.com/v1/search?type=track&limit=20&q=" + encodeURIComponent(query), {
      headers: { "Authorization": "Bearer " + tokenData.access_token }
    });
    const searchData = await searchResponse.json();
    if (!searchResponse.ok) throw new Error("Spotify search request failed");
    const tracks = (searchData?.tracks?.items || []).map((track: any) => ({
      id: track.id,
      title: track.name,
      artist: (track.artists || []).map((artist: any) => artist.name).join(", "),
      image: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || "",
      url: track.external_urls?.spotify || "",
      duration_ms: track.duration_ms,
      preview_url: track.preview_url || null
    }));
    return new Response(JSON.stringify({ tracks }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("spotify-search error", error);
    return new Response(JSON.stringify({ error: "Spotify search failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
