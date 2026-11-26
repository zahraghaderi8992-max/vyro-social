import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ShieldCheck, Code2, Activity, Send, Plus, Settings, History, X, Trash2, Archive, Paperclip, ImagePlus, Copy, Check, LoaderCircle, MessageSquare, Sparkles, ChevronDown, FileText } from 'lucide-react';
import { supabase, supabaseReady } from '../lib/supabase';

const SERVICE_LIST = [
  { id: 'assistant', title: 'Vyro AI', subtitle: 'دستیار هوشمند عمومی وایرو', icon: Bot, intro: 'سلام! من دستیار وایرو هستم. چطور میتونم کمکتون کنم؟' },
  { id: 'support', title: 'Vyro Support', subtitle: 'پشتیبانی هوشمند و راهنمای امکانات وایرو', icon: ShieldCheck, intro: 'سلام! من پشتیبان هوشمند وایرو هستم. مشکلت در کدام بخشه؟' },
  { id: 'code', title: 'Vyro Code AI', subtitle: 'همراه برنامه‌نویسی و تحلیل کد', icon: Code2, intro: 'سلام! من دستیار برنامه‌نویسی وایرو هستم. کد یا خطایت را بفرست.' },
  { id: 'status', title: 'گزارش وضعیت کد زنده', subtitle: 'گفت‌وگوی اختصاصی برای گزارش وضعیت موتور و پروژه', icon: Activity, intro: 'این گفت‌وگوی اختصاصی برای گزارش وضعیت کد زنده است. می‌توانی وضعیت موتور، سرویس‌ها، خطاها و کارهای باقی‌مانده را بپرسی.' }
];

const PROJECT_SNAPSHOT = {
  product: 'Vyro',
  repository: 'zahraghaderi8992-max/vyro-social',
  branch: 'main',
  frontend: 'React + Vite',
  platforms: ['Web', 'Android via Capacitor', 'Windows via Electron', 'iOS via Capacitor'],
  backend: 'Supabase',
  aiProvider: 'Cloudflare Workers AI',
  aiServices: ['Vyro AI', 'Vyro Support', 'Vyro Code AI', 'Code Live Status'],
  executionSandbox: 'not connected; generated code is not executed by the app',
  deploymentDetails: 'GitHub Actions and hosting status are not exposed to the in-app runtime and must not be guessed'
};

function displayDate(value) {
  try { return new Date(value).toLocaleString('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function normalizeMessage(row) {
  return { id: row.id, role: row.role, text: row.content, created_at: row.created_at, attachments: row.attachments || [] };
}

export default function VyroIntelligence({ session, onNotice }) {
  const userId = session?.user?.id;
  const verifiedTier = String(session?.user?.app_metadata?.vyro_tier || 'free').toLowerCase();
  const tier = verifiedTier === 'pro' ? 'plus' : (verifiedTier === 'plus' || verifiedTier === 'proplus' ? verifiedTier : 'free');
  const [service, setService] = useState('assistant');
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [notice, setLocalNotice] = useState('');
  const [quota, setQuota] = useState(null);
  const [model, setModel] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [imageMode, setImageMode] = useState(false);
  const [preferences, setPreferences] = useState({ custom_instructions: '', tone: 'friendly', language: 'auto', memory_enabled: true });
  const [copiedId, setCopiedId] = useState(null);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  const activeService = useMemo(() => SERVICE_LIST.find(item => item.id === service) || SERVICE_LIST[0], [service]);
  const serviceConversations = useMemo(() => conversations.filter(item => item.service === service && !item.archived), [conversations, service]);
  const filteredHistory = useMemo(() => conversations.filter(item => item.service === service && (item.title || '').toLowerCase().includes(historySearch.toLowerCase())), [conversations, service, historySearch]);

  const notify = useCallback((message) => {
    setLocalNotice(message);
    onNotice?.(message);
    window.setTimeout(() => setLocalNotice(''), 4200);
  }, [onNotice]);

  useEffect(() => {
    if (!userId || !supabaseReady) {
      setConversations([]);
      setMessages([]);
      setActiveId(null);
      return;
    }
    let live = true;
    const load = async () => {
      setPageLoading(true);
      const [chatResult, prefResult] = await Promise.all([
        supabase.from('vyro_ai_conversations').select('id,user_id,service,title,archived,created_at,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(120),
        supabase.from('vyro_ai_preferences').select('custom_instructions,tone,language,memory_enabled').eq('user_id', userId).maybeSingle()
      ]);
      if (!live) return;
      if (chatResult.error) notify('تاریخچه هوش مصنوعی بارگذاری نشد: ' + chatResult.error.message);
      setConversations(chatResult.data || []);
      if (prefResult.data) setPreferences(prefResult.data);
      setPageLoading(false);
    };
    load();
    return () => { live = false; };
  }, [userId, notify]);

  useEffect(() => {
    if (!activeId || !userId || !supabaseReady) {
      setMessages([]);
      return;
    }
    let live = true;
    const loadMessages = async () => {
      const { data, error } = await supabase.from('vyro_ai_messages').select('id,role,content,attachments,created_at').eq('conversation_id', activeId).eq('user_id', userId).order('created_at', { ascending: true }).limit(100);
      if (!live) return;
      if (error) { notify('پیام‌های قبلی بارگذاری نشدند: ' + error.message); return; }
      setMessages((data || []).map(normalizeMessage));
    };
    loadMessages();
    return () => { live = false; };
  }, [activeId, userId, notify]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const createConversation = useCallback(async (targetService) => {
    const descriptor = SERVICE_LIST.find(item => item.id === targetService) || SERVICE_LIST[0];
    const { data, error } = await supabase.from('vyro_ai_conversations').insert({
      user_id: userId, service: targetService, title: 'گفت‌وگوی جدید'
    }).select('id,user_id,service,title,archived,created_at,updated_at').single();
    if (error) throw error;
    setConversations(prev => [data, ...prev]);
    setActiveId(data.id);
    setMessages([{ role: 'assistant', text: descriptor.intro }]);
    return data;
  }, [userId]);

  const startNew = async () => {
    if (!userId || !supabaseReady) { notify('برای ذخیره گفت‌وگو ابتدا وارد حساب وایرو شو.'); return; }
    setHistoryOpen(false);
    setActiveId(null);
    setMessages([]);
    try { await createConversation(service); }
    catch (error) { notify('گفت‌وگوی جدید ساخته نشد: ' + error.message); }
  };

  const selectService = (next) => {
    setService(next);
    setHistoryOpen(false);
    setSettingsOpen(false);
    setDraft('');
    setAttachment(null);
    setImageMode(false);
    const latest = conversations.find(item => item.service === next && !item.archived);
    setActiveId(latest?.id || null);
    setMessages(latest ? [] : [{ role: 'assistant', text: (SERVICE_LIST.find(item => item.id === next) || SERVICE_LIST[0]).intro }]);
  };

  const savePreferences = async () => {
    if (!userId || !supabaseReady) return;
    const { error } = await supabase.from('vyro_ai_preferences').upsert({
      user_id: userId,
      custom_instructions: preferences.custom_instructions.slice(0, 3000),
      tone: preferences.tone,
      language: preferences.language,
      memory_enabled: preferences.memory_enabled,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) notify('تنظیمات ذخیره نشد: ' + error.message);
    else { setSettingsOpen(false); notify('تنظیمات اختصاصی هوش مصنوعی ذخیره شد.'); }
  };

  const attachFile = async (file) => {
    if (!file) return;
    const max = tier === 'free' ? 1024 * 1024 : tier === 'plus' ? 4 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > max) { notify('حجم فایل برای طرح فعلی بیشتر از حد مجاز است.'); return; }
    const allowed = /\.(txt|md|json|csv|log|js|jsx|ts|tsx|py|html|css|sql|xml|yaml|yml)$/i.test(file.name);
    if (!allowed) { notify('فعلاً فایل‌های متنی و کدنویسی پشتیبانی می‌شوند.'); return; }
    try {
      const content = await file.text();
      setAttachment({ name: file.name, content: content.slice(0, 12000), size: file.size });
      notify('فایل آماده تحلیل است؛ با پیام بعدی برای موتور ارسال می‌شود.');
    } catch { notify('خواندن فایل ممکن نشد.'); }
  };

  const send = async (event) => {
    event?.preventDefault?.();
    const value = draft.trim();
    if ((!value && !attachment && !imageMode) || loading) return;
    if (!userId || !supabaseReady) { notify('برای استفاده و ذخیره امن چت، ابتدا وارد حساب وایرو شو.'); return; }
    if (imageMode && service !== 'assistant') { notify('تولید تصویر فقط در Vyro AI فعال است.'); return; }

    let conversation = conversations.find(item => item.id === activeId);
    try {
      if (!conversation) conversation = await createConversation(service);
      const userText = imageMode ? value : (value || 'لطفاً فایل پیوست را بررسی کن.');
      const visibleText = attachment ? userText + ' · فایل: ' + attachment.name : userText;
      const userRow = { role: 'user', text: visibleText, attachments: attachment ? [{ name: attachment.name, size: attachment.size }] : [] };
      const nextVisible = [...messages.filter(item => item.role !== 'assistant' || item.text !== activeService.intro), userRow];
      setMessages(nextVisible);
      setDraft('');
      setLoading(true);

      const { data: insertedUser, error: insertError } = await supabase.from('vyro_ai_messages').insert({
        conversation_id: conversation.id, user_id: userId, role: 'user', content: visibleText,
        attachments: userRow.attachments
      }).select('id,created_at').single();
      if (insertError) throw insertError;
      userRow.id = insertedUser.id;
      userRow.created_at = insertedUser.created_at;

      const history = (preferences.memory_enabled ? messages.slice(-16) : messages.slice(-2))
        .filter(item => item.role === 'user' || item.role === 'assistant')
        .map(item => ({ role: item.role, content: item.text }));
      const payloadMessages = [...history, { role: 'user', content: imageMode ? value : (value || 'لطفاً فایل پیوست را بررسی کن.') }];
      const body = {
        service,
        messages: payloadMessages,
        preferences,
        projectSnapshot: {
          ...PROJECT_SNAPSHOT,
          clientBuildCommit: import.meta.env.VITE_GIT_COMMIT || 'در برنامه تزریق نشده',
          clientBuildTime: import.meta.env.VITE_BUILD_TIME || 'در برنامه تزریق نشده',
          currentRuntime: 'درخواست از برنامه واردشده وایرو ارسال شده است',
          reportRequestedAt: new Date().toISOString()
        }
      };
      if (attachment) body.attachment = attachment;
      if (imageMode) body.imagePrompt = value;
      const { data, error } = await supabase.functions.invoke('vyro-ai', { body });
      if (error) {
        let message = error.message || 'موتور پاسخ نداد';
        try { const context = await error.context?.clone?.().json(); if (context?.error) message = context.error; if (context?.quota) setQuota(context.quota); } catch {}
        throw new Error(message);
      }
      if (data?.quota) setQuota(data.quota);
      if (data?.model) setModel(data.model);
      const answer = data?.answer || (data?.imageUrl ? 'تصویر ساخته شد.' : '');
      if (!answer && !data?.imageUrl) throw new Error('پاسخی از موتور دریافت نشد.');
      const assistantRow = {
        role: 'assistant',
        text: answer,
        imageUrl: data?.imageUrl || null,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantRow]);
      const { error: saveError } = await supabase.from('vyro_ai_messages').insert({
        conversation_id: conversation.id, user_id: userId, role: 'assistant',
        content: answer || 'تصویر با موفقیت تولید شد.',
        attachments: data?.imageUrl ? [{ type: 'generated-image', ephemeral: true }] : []
      });
      if (saveError) notify('پاسخ نمایش داده شد، اما در تاریخچه ذخیره نشد: ' + saveError.message);
      const title = conversation.title === 'گفت‌وگوی جدید' ? visibleText.slice(0, 54) : conversation.title;
      await supabase.from('vyro_ai_conversations').update({ title, updated_at: new Date().toISOString() }).eq('id', conversation.id).eq('user_id', userId);
      setConversations(prev => prev.map(item => item.id === conversation.id ? { ...item, title, updated_at: new Date().toISOString() } : item));
      setAttachment(null);
      setImageMode(false);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'درخواست انجام نشد: ' + (error.message || 'خطای نامشخص') }]);
      notify(error.message || 'موتور هوش مصنوعی پاسخ نداد.');
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (item) => {
    if (!userId) return;
    const { error } = await supabase.from('vyro_ai_conversations').delete().eq('id', item.id).eq('user_id', userId);
    if (error) { notify('حذف گفت‌وگو انجام نشد: ' + error.message); return; }
    setConversations(prev => prev.filter(chat => chat.id !== item.id));
    if (activeId === item.id) { setActiveId(null); setMessages([]); }
  };

  const archiveConversation = async (item) => {
    const { error } = await supabase.from('vyro_ai_conversations').update({ archived: !item.archived, updated_at: new Date().toISOString() }).eq('id', item.id).eq('user_id', userId);
    if (error) { notify('بایگانی انجام نشد: ' + error.message); return; }
    setConversations(prev => prev.map(chat => chat.id === item.id ? { ...chat, archived: !item.archived } : chat));
    if (activeId === item.id) { setActiveId(null); setMessages([]); }
  };

  const copyText = async (message, index) => {
    try { await navigator.clipboard.writeText(message.text || ''); setCopiedId(index); window.setTimeout(() => setCopiedId(null), 1500); }
    catch { notify('کپی متن ممکن نشد.'); }
  };

  const historyItems = filteredHistory.filter(item => historyOpen ? true : !item.archived);
  const planName = tier === 'proplus' ? 'Pro Plus' : tier === 'plus' ? 'Plus' : 'Free';

  return <section className="vyro-intel card">
    <div className="vyro-intel-head">
      <div className="vyro-intel-brand"><span className="feature-icon"><Sparkles size={22}/></span><div><h2>هوش مصنوعی وایرو</h2><small>موتور مستقل · بدون OpenAI API</small></div></div>
      <div className="vyro-intel-tools">
        <span className="vyro-tier-pill">{planName}</span>
        <button type="button" className="vyro-icon-btn" onClick={() => { setHistoryOpen(v => !v); setSettingsOpen(false); }} title="تاریخچه"><History size={18}/></button>
        <button type="button" className="vyro-icon-btn" onClick={() => { setSettingsOpen(v => !v); setHistoryOpen(false); }} title="تنظیمات"><Settings size={18}/></button>
        <button type="button" className="vyro-icon-btn" onClick={startNew} title="گفت‌وگوی جدید"><Plus size={18}/></button>
      </div>
    </div>

    <div className="vyro-intel-services">
      {SERVICE_LIST.map(item => {
        const Icon = item.icon;
        return <button type="button" key={item.id} className={service === item.id ? 'selected' : ''} onClick={() => selectService(item.id)}>
          <Icon size={17}/><span>{item.title}</span>
        </button>;
      })}
    </div>

    {settingsOpen && <div className="vyro-intel-settings">
      <div className="vyro-intel-subhead"><div><b>تنظیمات هوش مصنوعی</b><small>شخصی‌سازی پاسخ‌های Vyro AI</small></div><button type="button" onClick={() => setSettingsOpen(false)}><X size={17}/></button></div>
      <label>لحن پاسخ‌ها<select value={preferences.tone} onChange={e => setPreferences(v => ({ ...v, tone: e.target.value }))}><option value="friendly">دوستانه</option><option value="professional">حرفه‌ای</option><option value="creative">خلاقانه</option><option value="concise">کوتاه و مستقیم</option></select></label>
      <label>زبان پاسخ<select value={preferences.language} onChange={e => setPreferences(v => ({ ...v, language: e.target.value }))}><option value="auto">مطابق زبان پیام</option><option value="fa">فارسی</option><option value="en">انگلیسی</option></select></label>
      <label>دستورهای شخصی‌سازی<textarea rows="3" maxLength={3000} value={preferences.custom_instructions} onChange={e => setPreferences(v => ({ ...v, custom_instructions: e.target.value }))} placeholder="مثلاً پاسخ‌ها را با مثال و مرحله‌به‌مرحله بنویس…"/></label>
      <label className="vyro-memory-toggle"><input type="checkbox" checked={preferences.memory_enabled} onChange={e => setPreferences(v => ({ ...v, memory_enabled: e.target.checked }))}/> استفاده از تاریخچه همین گفت‌وگو برای حفظ پیوستگی پاسخ‌ها</label>
      <button type="button" className="vyro-intel-primary" onClick={savePreferences}>ذخیره تنظیمات</button>
    </div>}

    {historyOpen && <div className="vyro-intel-history">
      <div className="vyro-intel-subhead"><div><b>تاریخچه {activeService.title}</b><small>گفت‌وگوهای ذخیره‌شده در حساب تو</small></div><button type="button" onClick={() => setHistoryOpen(false)}><X size={17}/></button></div>
      <input value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="جست‌وجو در عنوان گفت‌وگوها…"/>
      {historyItems.length ? historyItems.map(item => <div className="vyro-history-row" key={item.id}>
        <button type="button" className="vyro-history-open" onClick={() => { setActiveId(item.id); setHistoryOpen(false); }}>
          <MessageSquare size={16}/><span><b>{item.title}</b><small>{displayDate(item.updated_at)}{item.archived ? ' · بایگانی‌شده' : ''}</small></span>
        </button>
        <button type="button" title={item.archived ? 'بازگردانی' : 'بایگانی'} onClick={() => archiveConversation(item)}><Archive size={15}/></button>
        <button type="button" title="حذف" onClick={() => deleteConversation(item)}><Trash2 size={15}/></button>
      </div>) : <div className="vyro-intel-empty">گفت‌وگویی در این بخش پیدا نشد.</div>}
    </div>}

    <div className="vyro-intel-service-title"><div><b>{activeService.title}</b><small>{activeService.subtitle}</small></div><span className="vyro-engine-status"><i/> موتور مستقل</span></div>
    {!userId && <div className="vyro-intel-empty">برای استفاده از سرویس‌های هوشمند و ذخیره تاریخچه، ابتدا وارد حساب وایرو شو.</div>}
    {pageLoading && <div className="vyro-intel-empty">در حال بارگذاری تاریخچه…</div>}
    <div className="vyro-intel-messages">
      {messages.length ? messages.map((item, index) => <article className={'vyro-intel-message ' + item.role} key={item.id || index}>
        <div className="vyro-intel-message-meta"><b>{item.role === 'assistant' ? activeService.title : 'تو'}</b><small>{item.created_at ? displayDate(item.created_at) : ''}</small></div>
        {item.text && <p>{item.text}</p>}
        {item.imageUrl && <img className="vyro-intel-generated-image" src={item.imageUrl} alt="تصویر تولیدشده توسط Vyro AI"/>}
        {item.attachments?.length > 0 && <small className="vyro-intel-attachment"><FileText size={13}/>{item.attachments[0].name || 'فایل پیوست'}</small>}
        {item.role === 'assistant' && item.text && <button type="button" className="vyro-copy-answer" onClick={() => copyText(item, index)}>{copiedId === index ? <Check size={14}/> : <Copy size={14}/>} {copiedId === index ? 'کپی شد' : 'کپی پاسخ'}</button>}
      </article>) : <div className="vyro-intel-welcome"><span className="feature-icon"><activeService.icon size={24}/></span><b>{activeService.intro}</b><small>{activeService.subtitle}</small></div>}
      {loading && <div className="vyro-intel-thinking"><LoaderCircle size={17}/> در حال پردازش درخواست…</div>}
      <div ref={bottomRef}/>
    </div>
    {quota && <div className="vyro-quota-note">سهمیه امروز: {Number(quota.used || 0).toLocaleString('fa-IR')} از {Number(quota.limit || 0).toLocaleString('fa-IR')} · باقی‌مانده {Number(quota.remaining || 0).toLocaleString('fa-IR')}</div>}
    {model && <div className="vyro-model-note">مدل فعال: {model} · پردازش روی Workers AI</div>}
    {notice && <div className="vyro-intel-notice">{notice}</div>}
    <form className="vyro-intel-compose" onSubmit={send}>
      {attachment && <div className="vyro-file-chip"><FileText size={14}/>{attachment.name}<button type="button" onClick={() => setAttachment(null)}><X size={14}/></button></div>}
      <div className="vyro-compose-row">
        <button type="button" className={'vyro-compose-tool ' + (imageMode ? 'active' : '')} title="ساخت تصویر" disabled={service !== 'assistant'} onClick={() => setImageMode(v => !v)}><ImagePlus size={18}/></button>
        <button type="button" className="vyro-compose-tool" title="پیوست فایل متنی یا کد" onClick={() => fileRef.current?.click()}><Paperclip size={18}/></button>
        <input ref={fileRef} type="file" hidden accept=".txt,.md,.json,.csv,.log,.js,.jsx,.ts,.tsx,.py,.html,.css,.sql,.xml,.yaml,.yml" onChange={e => attachFile(e.target.files?.[0])}/>
        <textarea value={draft} rows={1} onChange={e => setDraft(e.target.value)} placeholder={imageMode ? 'توصیف تصویری که می‌خواهی بسازم…' : service === 'status' ? 'مثلاً: یک گزارش کامل از وضعیت فعلی کد زنده بده…' : service === 'code' ? 'کد، خطا یا درخواست برنامه‌نویسی را بنویس…' : 'پیامت را بنویس…'} disabled={loading}/>
        <button className="vyro-intel-send" type="submit" disabled={loading || (!draft.trim() && !attachment && !imageMode)}><Send size={17}/></button>
      </div>
      <small>{imageMode ? 'تولید تصویر با مدل مستقل FLUX انجام می‌شود.' : service === 'status' ? 'این چت برای گزارش وضعیت کد زنده جدا از چت برنامه‌نویسی است.' : 'فایل‌های متنی و کد با محدودیت حجم متناسب با طرح قابل پیوست‌اند.'}</small>
    </form>
  </section>;
}
