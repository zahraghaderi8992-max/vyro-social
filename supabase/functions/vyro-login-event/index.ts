import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

function deviceDetails(ua: string) {
  const platform = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Macintosh|Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "دستگاه ناشناس";
  let model = platform;
  const android = ua.match(/Android\s[\d.]+;\s*([^;)]+)/i);
  const apple = ua.match(/(iPhone|iPad|iPod)/i);
  const androidName = android?.[1]?.replace(/Build\/.*/, "").trim() || "";
  if (androidName && !/^(K|wv|x86|arm|Android)$/i.test(androidName)) model = androidName;
  else if (platform === "Android") model = "اندروید (مدل توسط مرورگر مخفی شده)";
  else if (apple?.[1]) model = apple[1];
  else if (platform === "Windows") model = /Windows NT 10/i.test(ua) ? "Windows 10/11 PC" : "Windows PC";
  const browser = /Edg\//i.test(ua) ? "Microsoft Edge" : /Firefox\//i.test(ua) ? "Firefox" : /Chrome\//i.test(ua) ? "Chrome" : /Safari\//i.test(ua) ? "Safari" : "مرورگر ناشناس";
  return { platform, model, browser };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return reply({ error: "Authentication required" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: "Bearer " + token } } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return reply({ error: "Invalid session" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
  const sessionId = String(body.session_id || "").slice(0, 180);
  if (!sessionId) return reply({ error: "Missing session id" }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: existing } = await admin.from("security_login_events").select("*").eq("user_id", authData.user.id).eq("session_id", sessionId).maybeSingle();
  if (existing) return reply({ ok: true, duplicate: true, event: existing });

  const ua = req.headers.get("user-agent") || String(body.user_agent || "");
  const details = deviceDetails(ua);
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const entryPath = String(body.entry_path || "Vyro").slice(0, 250);
  const loginMethod = String(body.login_method || "unknown").slice(0, 60);
  const { data: event, error: insertError } = await admin.from("security_login_events").insert({
    user_id: authData.user.id,
    session_id: sessionId,
    login_method: loginMethod,
    platform: details.platform,
    device_model: String(body.device_model || details.model).slice(0, 140),
    browser: String(body.browser || details.browser).slice(0, 80),
    entry_path: entryPath,
    ip_address: ip,
    user_agent: ua.slice(0, 1000)
  }).select("*").single();
  if (insertError) return reply({ error: "Could not record security event", details: insertError.message }, 500);

  const timestamp = new Date(event.created_at).toLocaleString("fa-IR", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Tehran" });
  const ipLabel = event.ip_address || "به دلایل حریم خصوصی یا محدودیت شبکه در دسترس نبود";
  const accountAgeMs = Date.now() - new Date(authData.user.created_at).getTime();
  const isSignup = String(body.event || "") === "SIGNED_UP" || (Number.isFinite(accountAgeMs) && accountAgeMs >= 0 && accountAgeMs < 180000);
  const content = [
    isSignup ? "🎉 به وایرو خوش آمدی!" : "🔐 هشدار امنیتی حساب وایرو",
    "",
    isSignup ? "حساب وایرو برای تو ساخته شد و اولین نشستت ثبت شد." : "یک ورود جدید به حساب تو ثبت شد.",
    "• تاریخ و ساعت: " + timestamp,
    "• روش ورود: " + loginMethod,
    "• پلتفرم: " + details.platform,
    "• مدل دستگاه: " + (body.device_model || details.model),
    "• مرورگر: " + (body.browser || details.browser),
    "• نشانی IP: " + ipLabel,
    "• مسیر ورود: " + entryPath,
    "",
    "اگر این ورود متعلق به تو نیست، فوراً نشست ناشناس را ببند:",
    "پروفایل ← تنظیمات ← حریم خصوصی و امنیت ← دستگاه‌ها ← انتخاب دستگاه ناشناس ← پایان دادن به نشست",
    "",
    "رمز عبورت را تغییر بده و کد ورود یا رمز یک‌بارمصرفت را در اختیار هیچ‌کس نگذار. پشتیبانی وایرو هرگز این اطلاعات را از تو نمی‌خواهد."
  ].join("\n");

  const { data: conversation, error: conversationError } = await admin.from("vyro_ai_conversations").insert({
    user_id: authData.user.id,
    service: "support",
    title: (isSignup ? "خوش‌آمدگویی و امنیت حساب" : "هشدار امنیتی ورود") + " · " + details.platform,
    archived: false
  }).select("id").single();

  if (!conversationError && conversation) {
    const { error: messageError } = await admin.from("vyro_ai_messages").insert({
      conversation_id: conversation.id,
      user_id: authData.user.id,
      role: "assistant",
      content,
      attachments: [{ kind: "security_login_event", event_id: event.id }]
    });
    if (!messageError) {
      await admin.from("security_login_events").update({ support_conversation_id: conversation.id }).eq("id", event.id);
    }
  }
  return reply({ ok: true, duplicate: false, event: { ...event, support_conversation_id: conversation?.id || null } });
});
