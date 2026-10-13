# VYRO — اتصال امن هوش مصنوعی و Spotify

پروژهٔ Supabase: https://supabase.com/dashboard/project/drwnfifwvyfplsiqnvlp

## 1) هوش مصنوعی واقعی (OpenAI API)

1. از پنل راه‌اندازی وایرو دکمهٔ «توابع Edge Functions» را باز کن.
2. یک تابع با نام دقیق `vyro-ai` بساز و گزینهٔ Verify JWT را روشن نگه دار.
3. محتوای فایل `supabase/functions/vyro-ai/index.ts` را در ویرایشگر تابع قرار بده و Deploy کن.
4. در Supabase > Edge Functions > Secrets این secret را اضافه کن: `OPENAI_API_KEY` = کلید API حساب OpenAI.
5. اختیاری: `OPENAI_MODEL` = `gpt-4o-mini`.
6. برنامه از طریق `supabase.functions.invoke('vyro-ai')` به این تابع وصل می‌شود.

**نکته:** کلید API را در کد فرانت‌اند، GitHub عمومی یا APK نگذار. اشتراک ChatGPT به‌تنهایی اعتبار API نمی‌دهد؛ API ممکن است نیازمند پرداخت جداگانه باشد.

## 2) جست‌وجوی آهنگ Spotify

1. در https://developer.spotify.com/dashboard یک اپ بساز.
2. از پنل Spotify، Client ID و Client Secret را بردار.
3. در Supabase Edge Functions > Secrets این دو secret را تعریف کن:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
4. یک تابع با نام دقیق `spotify-search` بساز و محتوای `supabase/functions/spotify-search/index.ts` را وارد و Deploy کن.
5. تابع از Spotify Web API برای جست‌وجوی آهنگ استفاده می‌کند. برای بازکردن/پخش کامل، آهنگ در Spotify باز می‌شود؛ دانلود فایل موسیقی از Spotify ارائه نمی‌شود.

## 3) دسترسی فایل‌ها و پوشهٔ دانلود

اپ هنگام ورود، پوشهٔ `VYRO/Downloads` را در فضای Documents اختصاصی اپ می‌سازد. این پوشه ممکن است در Android در فضای اسناد اپ دیده شود و به معنی دسترسی نامحدود به کل گالری نیست. انتخاب عکس/ویدیو باید از انتخاب‌گر فایل Android و با اقدام خود کاربر انجام شود.

## 4) تأیید ثبت‌نام

دو تیک قوانین و «من ربات نیستم» در فرم ثبت‌نام اضافه شده‌اند. تیک «من ربات نیستم» به‌تنهایی CAPTCHA واقعی نیست؛ برای جلوگیری واقعی از ثبت‌نام خودکار باید Turnstile یا hCaptcha را سمت سرور نیز فعال کرد.

## 5) محدودیت جغرافیایی و IP

کد از APIهای رسمی و تابع سمت سرور استفاده می‌کند تا کلیدها در گوشی نباشند؛ این کار به‌خودی‌خود محدودیت‌های جغرافیایی سرویس‌ها را دور نمی‌زند و IP ثابت، دسترسی یا حفظ حساب را تضمین نمی‌کند. از سرویس‌ها فقط در مناطق و شرایطی استفاده کن که خود ارائه‌دهنده مجاز می‌داند.
