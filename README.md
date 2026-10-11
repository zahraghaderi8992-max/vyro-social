# VYRO — وایرو

شبکه اجتماعی فارسی با رابط راست‌چین، طراحی تیره و رنگ شاخص لیمویی.

## وضعیت فعلی
این مخزن شامل پایه اولیه رابط React/Vite، اتصال اختیاری Supabase و گردش‌کار ساخت APK اندروید است. این نسخه هنوز محصول نهایی نیست؛ پیام‌رسانی، استوری واقعی، رسانه‌ها، لایک‌ها و پنل مدیریت کامل باید جداگانه پیاده‌سازی و آزمایش شوند.

## پیش‌نمایش محلی
- Node.js 20 یا جدیدتر
- `npm install`
- `npm run dev`

## تنظیم Supabase
در تنظیمات مخزن GitHub، به **Settings → Secrets and variables → Actions** برو و این Repository secrets را اضافه کن:
- `VITE_SUPABASE_URL` = آدرس پروژه Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY` = کلید publishable پروژه

هرگز کلید `service_role` یا secret را در برنامهٔ فرانت‌اند قرار نده.

## ساخت APK از طریق GitHub Actions
از تب **Actions**، گردش‌کار **Build VYRO Android APK** را انتخاب کن و روی **Run workflow** بزن. پس از موفقیت، artifact با نام `vyro-debug-apk` را از اجرای workflow دریافت کن. APK فعلی از نوع debug و برای آزمایش است، نه انتشار نهایی در فروشگاه.

## امنیت
پیش از استفاده عمومی، سیاست‌های RLS در Supabase—به‌ویژه جلوگیری از تغییر نقش کاربر و اطمینان از عضویت در گفتگو پیش از ارسال/خواندن پیام—باید بازبینی و سخت‌سازی شوند.
