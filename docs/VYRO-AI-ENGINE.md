# موتور مستقل هوش مصنوعی وایرو

## هدف

بخش گفت‌وگوی وایرو از SDK، endpoint و کلید OpenAI استفاده نمی‌کند. Edge Function با `fetch` استاندارد Deno مستقیماً به API بومی Ollama وصل می‌شود:

- گفت‌وگو: `POST /api/chat`
- مدل پیش‌فرض پیشنهادی: `qwen2.5:7b` (برای فارسی و چندزبانه)
- سطوح: `VYRO_FREE_MODEL`, `VYRO_PRO_MODEL`, `VYRO_PROPLUS_MODEL`
- تولید تصویر: سرویس جداگانهٔ Stable Diffusion WebUI / Forge با endpoint بومی `/sdapi/v1/txt2img`

هیچ کتابخانهٔ OpenAI، نشانی OpenAI یا OpenAI API key در این مسیر استفاده نمی‌شود.

## معماری

`Vyro React client → Supabase Edge Function vyro-ai → Ollama server`

درخواست از کلاینت به Edge Function می‌رود؛ URL موتور و نام مدل در کلاینت قرار نمی‌گیرد. تاریخچهٔ محلی گفتگو به‌صورت جداگانه روی همان دستگاه ذخیره می‌شود. سطح اشتراک پولی باید در `app_metadata.vyro_tier` سمت سرور تأیید شود؛ انتخاب سطح در UI به‌تنهایی مجوز دسترسی نیست.

## راه‌اندازی موتور متنی

1. روی یک سرور همیشه‌روشن با RAM/VRAM کافی، Ollama نصب کن.
2. مدل را روی همان سرور دریافت کن، برای نمونه:

   ```bash
   ollama pull qwen2.5:7b
   ollama serve
   ```

3. سرویس را فقط از طریق یک شبکهٔ خصوصی یا reverse proxy امن در دسترس Edge Function قرار بده. آدرس `localhost` یا `127.0.0.1` در Supabase Edge Function به کامپیوتر شخصی کاربر اشاره نمی‌کند.
4. در Supabase Edge Function Secrets این متغیرها را تنظیم کن:

   - `VYRO_OLLAMA_URL`: آدرس پایهٔ سرور Ollama، بدون `/api/chat`
   - `VYRO_DEFAULT_MODEL`: مثلاً `qwen2.5:7b`
   - `VYRO_FREE_MODEL`: مدل سطح رایگان
   - `VYRO_PRO_MODEL`: مدل سطح Plus
   - `VYRO_PROPLUS_MODEL`: مدل سطح Pro Plus
   - `VYRO_AI_TIMEOUT_MS`: اختیاری؛ پیش‌فرض 90000 و حداکثر 180000

5. Edge Function را deploy کن و با یک حساب آزمایشی، پاسخ فارسی و timeout را بررسی کن.

نمونهٔ تنظیم متغیرها با Supabase CLI:

```bash
supabase secrets set VYRO_OLLAMA_URL=https://YOUR-PRIVATE-AI-HOST
supabase secrets set VYRO_DEFAULT_MODEL=qwen2.5:7b
supabase functions deploy vyro-ai
```

مقادیر نمونه را با آدرس واقعی جایگزین کن. هیچ secret یا URL خصوصی را در کد React، مخزن عمومی یا پیام‌های چت قرار نده.

## امنیت شبکه

Ollama به‌طور پیش‌فرض API احراز هویت‌شده‌ای مشابه سرویس‌های تجاری ارائه نمی‌کند. پورت 11434 را مستقیماً روی اینترنت باز نکن. دسترسی را با شبکهٔ خصوصی، فایروال، reverse proxy دارای احراز هویت و محدودسازی دسترسی به callerهای مجاز محافظت کن. اگر میزبان inference امن در دسترس نباشد، قابلیت آنلاین را فعال نکن.

## تولید تصویر

موتور متن و موتور تصویر مستقل‌اند. برای فعال‌سازی تصویر:

1. یک سرور Stable Diffusion WebUI یا Forge با API فعال نصب کن.
2. آن را از طریق شبکهٔ خصوصی یا reverse proxy امن در دسترس قرار بده.
3. متغیر `VYRO_IMAGE_ENGINE_URL` را با آدرس پایهٔ آن تنظیم کن.
4. endpoint `/sdapi/v1/txt2img` را با یک درخواست آزمایشی بررسی کن.

تا وقتی سرور تصویر نصب و آزمایش نشده، UI ممکن است درخواست را ارسال کند اما نباید ادعا کند تصویر ساخته شده است.

## وضعیت فعلی این پیاده‌سازی

- مسیر Edge Function به API بومی Ollama تغییر کرده است.
- پاسخ‌های ساختگی محلی حذف شده‌اند؛ در نبود موتور، خطای روشن نمایش داده می‌شود.
- مسیر تولید تصویر به API بومی Stable Diffusion WebUI/Forge تغییر کرده است.
- تاریخچهٔ گفتگو در مرورگر/دستگاه کاربر ذخیره می‌شود.
- این مخزن به‌تنهایی مدل را میزبانی یا دانلود نمی‌کند. برای پاسخ واقعی باید Ollama و مدل روی سرور نصب و متغیرهای امن تنظیم شوند.
- تا زمان deploy و تست با موتور واقعی، قابلیت آنلاین «آمادهٔ تولید» محسوب نمی‌شود.
