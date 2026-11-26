export default {
 async fetch(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = [
   "https://vyro-web-b9p.pages.dev",
   "https://zahraghaderi8992-max.github.io",
   "capacitor://localhost",
   "http://localhost",
   "https://localhost"
  ];
  const corsOrigin = allowed.includes(origin) ? origin : "https://vyro-web-b9p.pages.dev";
  const cors = {
   "Access-Control-Allow-Origin": corsOrigin,
   "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
   "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey",
   "Vary": "Origin"
  };
  const json = (data, status) => new Response(JSON.stringify(data), {
   status: status || 200,
   headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method === "GET") return json({
   service: "Vyro Independent AI Engine",
   status: "online",
   provider: "Cloudflare Workers AI",
   services: ["assistant", "support", "code", "status", "image-generation"],
   models: {
    free: "@cf/meta/llama-3.2-3b-instruct",
    plus: "@cf/meta/llama-3.1-8b-instruct-fast",
    proplus: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    image: "@cf/black-forest-labs/flux-1-schnell"
   },
   openai_api_key_required: false,
   checked_at: new Date().toISOString()
  });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
   const auth = request.headers.get("Authorization") || "";
   const apiKey = request.headers.get("apikey") || "";
   if (!auth.startsWith("Bearer ") || !apiKey) return json({ error: "برای استفاده از هوش مصنوعی باید وارد حساب وایرو شوی." }, 401);

   const supabaseUrl = "https://drwnfifwvyfplsiqnvlp.supabase.co";
   const verify = await fetch(supabaseUrl + "/auth/v1/user", {
    headers: { "apikey": apiKey, "Authorization": auth }
   });
   if (!verify.ok) return json({ error: "نشست ورود معتبر نیست؛ دوباره وارد حساب وایرو شو." }, 401);
   const user = await verify.json();
   const body = await request.json();
   const service = ["assistant", "support", "code", "status"].includes(body && body.service) ? body.service : "assistant";
   const imagePrompt = typeof body.imagePrompt === "string" ? body.imagePrompt.trim().slice(0, 1800) : "";
   const kind = imagePrompt ? "image" : (body.attachment ? "upload" : "message");
   const quotaService = service;

   const quotaResponse = await fetch(supabaseUrl + "/rest/v1/rpc/vyro_consume_ai_quota", {
    method: "POST",
    headers: {
     "apikey": apiKey,
     "Authorization": auth,
     "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_service: quotaService, p_kind: kind })
   });
   if (!quotaResponse.ok) {
    const detail = await quotaResponse.text();
    console.error("Vyro quota check failed", quotaResponse.status, detail.slice(0, 180));
    return json({ error: "بررسی سهمیه هوش مصنوعی انجام نشد. کمی بعد دوباره تلاش کن.", code: "QUOTA_CHECK_FAILED" }, 503);
   }
   const quota = await quotaResponse.json();
   if (!quota || quota.allowed !== true) {
    return json({
     error: "سهمیه روزانه این بخش به پایان رسیده است.",
     code: "AI_QUOTA_EXCEEDED",
     quota: quota || null
    }, 429);
   }

   const rawTier = String(user && user.app_metadata && user.app_metadata.vyro_tier || "free").toLowerCase();
   const tier = rawTier === "pro" ? "plus" : (rawTier === "proplus" || rawTier === "plus" ? rawTier : "free");
   if (imagePrompt) {
    if (service !== "assistant") return json({ error: "ساخت تصویر فقط در Vyro AI فعال است." }, 400);
    const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt: imagePrompt });
    const bytes = result instanceof ArrayBuffer ? new Uint8Array(result) :
     result instanceof Uint8Array ? result :
     result && result.image ? Uint8Array.from(atob(result.image), c => c.charCodeAt(0)) : null;
    if (!bytes) return json({ error: "مدل تصویر خروجی قابل نمایش نداد." }, 502);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return json({ imageUrl: "data:image/png;base64," + btoa(binary), quota, tier, model: "FLUX.1 schnell" });
   }

   const messages = Array.isArray(body && body.messages) ? body.messages
    .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .slice(-18).map(m => ({ role: m.role, content: m.content.slice(0, 9000) })) : [];
   if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "پیام کاربر ارسال نشده است." }, 400);

   const preferences = body && body.preferences && typeof body.preferences === "object" ? body.preferences : {};
   const customInstructions = typeof preferences.custom_instructions === "string" ? preferences.custom_instructions.slice(0, 2500) : "";
   const tone = ["friendly", "professional", "creative", "concise"].includes(preferences.tone) ? preferences.tone : "friendly";
   const language = ["fa", "en", "auto"].includes(preferences.language) ? preferences.language : "auto";
   const snapshot = body && body.projectSnapshot && typeof body.projectSnapshot === "object" ? body.projectSnapshot : {};

   const base = "تو یکی از سرویس‌های هوشمند مستقل وایرو هستی. پاسخ را به زبان کاربر بده؛ فارسی زبان پیش‌فرض است. دقیق، صادق، امن و کاربردی باش. هرگز ادعا نکن کاری را اجرا، ذخیره، بررسی یا deploy کرده‌ای مگر واقعاً در همین درخواست انجام شده باشد.";
   const prompts = {
    assistant: base + " نقش تو Vyro AI است؛ دستیار عمومی و چندمنظوره وایرو. برای آموزش، تحلیل، برنامه‌ریزی، نوشتن، حل مسئله و پرسش‌های عمومی کمک کن. اگر چیزی را نمی‌دانی شفاف بگو. لحن انتخاب‌شده: " + tone + ". زبان ترجیحی: " + language + ".",
    support: base + " نقش تو Vyro Support، پشتیبان اختصاصی محصول وایرو است؛ نه دستیار عمومی. راهنمایی‌ها را بر اساس این دانش‌نامه بده: وایرو یک شبکه اجتماعی با تب‌های اکسپلور، چت، هوش مصنوعی، موزیو و پروفایل است؛ ادمین‌ها پنل مدیریت جدا دارند. ثبت‌نام ممکن است به کد دعوت نیاز داشته باشد. چت از گفت‌وگوی خصوصی، گروه و کانال پشتیبانی می‌کند. پیام‌های ذخیره‌شده برای هر کاربر شخصی‌اند. اکسپلور شامل استوری و پست است. موزیو کتابخانه، علاقه‌مندی و آلبوم شخصی دارد. اگر مشکل حساب، پرداخت، امنیت، حذف حساب یا دسترسی پیش آمد، رمز عبور، کد یک‌بارمصرف یا توکن درخواست نکن؛ متن خطا، زمان تقریبی و نام بخش را بپرس. هرگز سیاست یا قابلیت تأییدنشده را قطعی معرفی نکن. برای حل‌نشدنی‌ها پیشنهاد بده از مسیر پشتیبانی انسانی/پیام به ادمین داخل وایرو پیگیری شود. پاسخ‌ها مرحله‌به‌مرحله و کوتاه باشند.",
    code: base + " نقش تو Vyro Code AI است؛ مهندس نرم‌افزار ارشد برای پروژه Vyro با React، Vite، Capacitor، Supabase و Cloudflare Workers AI. کدهای قابل اجرا، امن و منطبق با ساختار موجود پیشنهاد بده. پیش از تغییر، علت و فایل‌های درگیر را مشخص کن. اگر کد می‌نویسی زبان و مسیر فایل را ذکر کن و کد کامل بده. خطاها را با علت احتمالی، روش بازتولید و راه‌حل تفکیک کن. هرگز ادعا نکن فایل‌های مخزن را مستقیماً تغییر داده یا اجرا کرده‌ای. اجرای کد در sandbox در این چت فعال نیست؛ بنابراین خروجی را به‌عنوان اجراشده گزارش نکن. اولویت با حفظ معماری فعلی و branch main است.",
    status: base + " تو چت اختصاصی «گزارش وضعیت کد زنده» در Vyro هستی. فقط گزارش وضعیت واقعی و قابل استناد پروژه و موتور هوش مصنوعی را ارائه کن. اطلاعات snapshot زیر از برنامه ارسال شده است: " + JSON.stringify(snapshot).slice(0, 6500) + ". branch ثبت‌شده پروژه main است. اگر commit یا وضعیت GitHub Actions در snapshot موجود نیست، صریح بگو از داخل برنامه قابل تأیید نیست؛ حدس نزن. وضعیت Worker و مدل فعال را از داده‌های snapshot تفکیک کن. گزارش را در چهار بخش بده: وضعیت فعلی، موارد سالم، موارد نیازمند بررسی، کار بعدی پیشنهادی. اگر کاربر گزارش تازه خواست، محدودیت اطلاعات زنده را روشن کن."
   };
   let system = prompts[service];
   if (customInstructions && service === "assistant") system += " دستورهای شخصی‌سازی کاربر: " + customInstructions;
   if (body.attachment && typeof body.attachment.content === "string") {
    const fileName = String(body.attachment.name || "attachment.txt").slice(0, 120);
    const fileContent = body.attachment.content.slice(0, 12000);
    messages[messages.length - 1].content += "\n\n[محتوای فایل پیوست: " + fileName + "]\n" + fileContent + "\n[پایان فایل]";
   }

   const model = tier === "proplus" ? "@cf/meta/llama-3.3-70b-instruct-fp8-fast" :
    tier === "plus" ? "@cf/meta/llama-3.1-8b-instruct-fast" : "@cf/meta/llama-3.2-3b-instruct";
   const maxTokens = tier === "proplus" ? 1800 : tier === "plus" ? 1200 : 700;
   const result = await env.AI.run(model, {
    messages: [{ role: "system", content: system }, ...messages],
    max_tokens: maxTokens,
    temperature: service === "code" ? 0.25 : 0.65
   });
   const answer = result && (result.response || result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content);
   if (typeof answer !== "string" || !answer.trim()) return json({ error: "مدل پاسخ متنی برنگرداند." }, 502);
   return json({
    answer,
    service,
    provider: "Cloudflare Workers AI",
    model,
    tier,
    quota
   });
  } catch (error) {
   console.error("Vyro independent AI error", error);
   return json({ error: "موتور هوشمند وایرو موقتاً پاسخ نداد.", detail: String(error && error.message || error).slice(0, 220) }, 502);
  }
 }
};