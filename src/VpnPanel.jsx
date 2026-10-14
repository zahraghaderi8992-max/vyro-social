import { useEffect, useState } from 'react';
import { Share } from '@capacitor/share';
import { ShieldCheck, RefreshCw, Share2, Trash2, Info } from 'lucide-react';

const STORAGE_KEY = 'vyro-private-subscription-url';

export default function VpnPanel({ onNotice }) {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const value = localStorage.getItem(STORAGE_KEY) || '';
      setUrl(value);
      setSaved(Boolean(value));
    } catch {}
  }, []);

  function saveUrl() {
    const value = url.trim();
    if (!/^https:\/\//i.test(value)) {
      onNotice('لینک اشتراک باید با https:// شروع شود.');
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, value);
      setUrl(value);
      setSaved(true);
      onNotice('لینک فقط روی همین دستگاه ذخیره شد.');
    } catch {
      onNotice('ذخیره‌سازی محلی در دسترس نیست.');
    }
  }

  async function sendToClient() {
    if (!url.trim()) {
      onNotice('اول لینک اشتراک خودت را وارد و ذخیره کن.');
      return;
    }
    setBusy(true);
    try {
      await Share.share({
        title: 'اشتراک وایرو',
        text: url.trim(),
        dialogTitle: 'لینک اشتراک را به V2Pro یا Happ بده'
      });
      onNotice('اگر V2Pro یا Happ در فهرست اشتراک‌گذاری نمایش داده شد، آن را انتخاب کن و واردات را در همان برنامه تأیید کن.');
    } catch (error) {
      try {
        await navigator.clipboard.writeText(url.trim());
        onNotice('اشتراک‌گذاری باز نشد؛ لینک کپی شد. آن را فقط داخل برنامه VPN خودت وارد کن.');
      } catch {
        onNotice('اشتراک‌گذاری در این دستگاه در دسترس نیست. لینک را از کادر کپی کن.');
      }
    } finally {
      setBusy(false);
    }
  }

  function refreshLink() {
    // Subscription URLs are refreshed by the provider/client. This safely re-shares the latest URL;
    // fetching it in the WebView is not reliable because providers often block browser CORS requests.
    onNotice('برای دریافت پیکربندی تازه، لینک را دوباره به V2Pro یا Happ بده؛ خود وایرو هنوز موتور VPN داخلی ندارد.');
    void sendToClient();
  }

  function clearUrl() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setUrl('');
    setSaved(false);
    onNotice('لینک اشتراک از حافظهٔ محلی وایرو پاک شد.');
  }

  return (
    <section className="simple-panel card" style={{textAlign:'right', gap:16}}>
      <span className="feature-icon"><ShieldCheck size={24}/></span>
      <h2>اتصال امن وایرو</h2>
      <p>مدیریت خصوصی لینک اشتراک برای انتقال به V2Pro یا Happ. لینک اشتراک داخل مخزن GitHub قرار نمی‌گیرد.</p>
      <div className="settings-detail" style={{display:'grid',gap:10}}>
        <label htmlFor="vyro-subscription-url">لینک اشتراک خصوصی</label>
        <input
          id="vyro-subscription-url"
          type="url"
          dir="ltr"
          autoComplete="off"
          spellCheck="false"
          placeholder="https://…"
          value={url}
          onChange={e => { setUrl(e.target.value); setSaved(false); }}
          style={{width:'100%',boxSizing:'border-box',padding:12,borderRadius:12}}
        />
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="primary-btn" type="button" onClick={saveUrl}>ذخیره روی این گوشی</button>
          <button className="secondary-btn" type="button" onClick={sendToClient} disabled={busy}>
            <Share2 size={16}/> {busy ? 'در حال بازکردن…' : 'ارسال به برنامه VPN'}
          </button>
          <button className="secondary-btn" type="button" onClick={refreshLink}>
            <RefreshCw size={16}/> ارسال دوباره / به‌روزرسانی
          </button>
          {saved && <button className="secondary-btn" type="button" onClick={clearUrl}><Trash2 size={16}/> پاک‌کردن لینک</button>}
        </div>
        {saved && <small>لینک در حافظهٔ همین دستگاه ذخیره شده است؛ در صورت پاک‌کردن داده‌های برنامه ممکن است حذف شود.</small>}
      </div>
      <div className="settings-detail" style={{display:'flex',alignItems:'flex-start',gap:10}}>
        <Info size={19}/>
        <div>
          <b>مهم دربارهٔ اتصال</b>
          <p>این مرحله لینک را به منوی اشتراک‌گذاری اندروید می‌فرستد تا اگر V2Pro یا Happ آن را پشتیبانی کند، همان‌جا واردش کنی. هنوز تونل VPN بومی داخل وایرو ساخته نشده و وایرو نمی‌تواند وضعیت اتصال آن برنامه‌ها را تشخیص دهد یا اشتراک را در پس‌زمینه خودش تازه کند.</p>
          <p>لینک اشتراک مثل رمز دسترسی است؛ آن را برای دیگران نفرست و در پیام عمومی یا مخزن کد قرار نده.</p>
        </div>
      </div>
    </section>
  );
}
