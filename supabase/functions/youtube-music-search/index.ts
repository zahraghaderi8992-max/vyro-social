import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" }
});
const normalize = (value: string) => value.toLocaleLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const score = (query: string, title: string, channel: string) => {
  const q = normalize(query), t = normalize(title), c = normalize(channel);
  const tokens = q.split(/\s+/).filter(Boolean);
  let result = t === q ? 120 : t.includes(q) ? 95 : 0;
  for (const token of tokens) {
    if (t.includes(token)) result += 10;
    if (c.includes(token)) result += 3;
  }
  if (/\b(official|official audio|lyrics|lyric video|audio|music video)\b/i.test(title)) result += 5;
  if (/\b(cover|reaction|tutorial|review|shorts|podcast|live stream)\b/i.test(title)) result -= 18;
  return result;
};
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const query = typeof body?.query === "string" ? body.query.trim().slice(0, 160) : "";
    if (!query) return json({ results: [] });
    const fallbackUrl = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query + " music");
    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!apiKey) return json({ results: [], fallbackUrl, setupRequired: true });
    const params = new URLSearchParams({
      part: "snippet", type: "video", videoEmbeddable: "true",
      videoSyndicated: "true", videoCategoryId: "10", maxResults: "15",
      safeSearch: "moderate", q: query, key: apiKey,
    });
    const response = await fetch("https://www.googleapis.com/youtube/v3/search?" + params.toString());
    const payload = await response.json();
    if (!response.ok) {
      console.error("YouTube API error", response.status, payload?.error?.errors?.[0]?.reason || "unknown");
      return json({ results: [], fallbackUrl, error: "YouTube search API unavailable" });
    }
    const results = (payload.items || [])
      .filter((item: any) => item?.id?.videoId && item?.snippet?.title)
      .map((item: any) => ({
        id: String(item.id.videoId),
        title: String(item.snippet.title).replace(/<[^>]*>/g, "").slice(0, 240),
        channelTitle: String(item.snippet.channelTitle || "YouTube").slice(0, 120),
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
        url: "https://www.youtube.com/watch?v=" + encodeURIComponent(item.id.videoId),
        _score: score(query, item.snippet.title, item.snippet.channelTitle || ""),
      }))
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, 12)
      .map(({ _score, ...item }: any) => item);
    return json({ results, fallbackUrl });
  } catch (error) {
    console.error("youtube-music-search error", error);
    return json({ results: [], error: "Invalid request" }, 400);
  }
});
