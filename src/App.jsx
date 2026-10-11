import { useEffect, useState } from 'react';
import { Activity, Bell, Compass, Heart, Home, ImagePlus, LogIn, MessageCircle, Music2, Plus, Send, ShieldCheck, Sparkles, UserRound, Settings, X, Search, Paperclip, Mic, Bot, Headphones, ChevronLeft } from 'lucide-react';
import { supabase, supabaseReady } from './lib/supabase';

const demoPosts = [
  { id: 'demo-1', username: 'vyro.team', display_name: 'VYRO Studio', time: 'همین حالا', content: 'اینجا شروع یک ارتباط تازه است. ✨\nبه وایرو خوش آمدی؛ خودت باش، بی‌مرز بدرخش.', likes: 128 },
  { id: 'demo-2', username: 'mood.daily', display_name: 'Mood Daily', time: '۲ ساعت پیش', content: 'گاهی بهترین اتفاق، اینه که برای چند دقیقه همه‌چیز رو آروم کنی و فقط نفس بکشی. 🌙', likes: 64 }
];
const conversations = [
  { id: 1, name: 'تیم وایرو', handle: '@vyro.team', avatar: 'V', last: 'به وایرو خوش اومدی ✨', time: 'الان', unread: 2 },
  { id: 2, name: 'مینا', handle: '@mina.art', avatar: 'م', last: 'اون عکس خیلی قشنگ بود!', time: '۱۰ دقیقه', unread: 0 },
  { id: 3, name: 'آرین', handle: '@arian.music', avatar: 'آ', last: 'بعداً برات می‌فرستم 🎧', time: '۱ ساعت', unread: 0 }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [posts, setPosts] = useState(demoPosts);
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('vyro-start-tab') || 'explore'; } catch { return 'explore'; }
  });
  const [startTab, setStartTab] = useState(() => {
    try { return localStorage.getItem('vyro-start-tab') || 'explore'; } catch { return 'explore'; }
  });
  const [composer, setComposer] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [chatId, setChatId] = useState(1);
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState([{ from: 'them', text: 'سلام! به دنیای وایرو خوش اومدی 💛', time: 'الان' }, { from: 'me', text: 'ممنون! خوشحالم اینجام ✨', time: 'الان' }]);
  const [liked, setLiked] = useState([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply] = useState('');

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!supabaseReady) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabaseReady) return;
    supabase.from('posts').select('id,content,created_at,user_id,profiles(username,display_name,avatar_url)').order('created_at', { ascending: false }).limit(30)
      .then(({ data, error }) => {
        if (data && !error) setPosts(data.map(p => ({ id: p.id, username: p.profiles?.username || 'vyro_user', display_name: p.profiles?.display_name || 'عضو وایرو', time: new Date(p.created_at).toLocaleString('fa-IR'), content: p.content || '', likes: 0 })));
      });
  }, [session]);

  async function authenticate(e) {
    e.preventDefault(); setBusy(true); setNotice('');
    if (!supabaseReady) { setNotice('اتصال حساب آنلاین هنوز در تنظیمات ساخت فعال نشده است.'); setBusy(false); return; }
    const action = authMode === 'login' ? supabase.auth.signInWithPassword({ email, password }) : supabase.auth.signUp({ email, password });
    const { error } = await action;
    setNotice(error ? error.message : (authMode === 'login' ? 'ورود موفق بود.' : 'حساب ساخته شد؛ اگر تأیید ایمیل فعال است، ایمیلت را بررسی کن.'));
    setBusy(false);
  }

  function navigate(next) { setTab(next); }
  function saveStartTab(value) {
    setStartTab(value);
    try { localStorage.setItem('vyro-start-tab', value); } catch {}
    setNotice(value === 'explore' ? 'اکسپلور به‌عنوان صفحهٔ شروع ذخیره شد.' : 'خانه به‌عنوان صفحهٔ شروع ذخیره شد.');
  }

  async function publish() {
    const content = composer.trim();
    if (!content) return;
    if (!session || !supabaseReady) {
      setPosts([{ id: String(Date.now()), username: 'you', display_name: 'پیش‌نمایش شما', time: 'همین حالا', content, likes: 0 }, ...posts]);
      setComposer(''); setNotice('پست به پیش‌نمایش اضافه شد؛ برای ذخیره آنلاین وارد حساب شو.'); return;
    }
    const { error } = await supabase.from('posts').insert({ user_id: session.user.id, content });
    if (error) setNotice(error.message);
    else { setPosts([{ id: String(Date.now()), username: session.user.email?.split('@')[0] || 'you', display_name: 'شما', time: 'همین حالا', content, likes: 0 }, ...posts]); setComposer(''); setNotice('پست منتشر شد.'); }
  }

  function sendChat(e) {
    e?.preventDefault();
    const text = chatDraft.trim();
    if (!text) return;
    setChatMessages([...chatMessages, { from: 'me', text, time: 'الان' }]);
    setChatDraft('');
    setNotice('پیام در نمای آزمایشی اضافه شد؛ اتصال پیام‌رسانی زنده هنوز باید پیاده‌سازی شود.');
  }

  const title = ({ explore: 'اکسپلور', home: 'خانه', messages: 'پیام‌ها', activity: 'اعلان‌ها', profile: 'پروفایل', music: 'موسیقی', ai: 'هوش مصنوعی', settings: 'تنظیمات', support: 'مرکز پشتیبانی' })[tab] || 'اکسپلور';

  return <div className="app-shell" dir="rtl">
    <aside className="sidebar">
      <a className="brand" href="#top" onClick={e => {e.preventDefault();navigate('explore')}}><span className="brand-mark">V</span><span>VYRO<span className="brand-dot">.</span></span></a>
      <div className="side-caption">فضای تو، دنیای تو</div>
      <nav>
        <button className={tab === 'explore' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('explore')}><Compass size={19}/> اکسپلور</button>
        <button className={tab === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('home')}><Home size={19}/> خانه</button>
        <button className={tab === 'messages' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('messages')}><MessageCircle size={19}/> چت</button>
        <button className={tab === 'activity' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('activity')}><Bell size={19}/> اعلان‌ها</button>
        <button className={tab === 'music' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('music')}><Music2 size={19}/> موسیقی</button>
        <button className={tab === 'ai' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('ai')}><Bot size={19}/> دستیار هوشمند</button>
        <button className={tab === 'profile' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('profile')}><UserRound size={19}/> پروفایل</button>
        <button className={tab === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('settings')}><Settings size={19}/> تنظیمات</button>
        {session?.user?.email?.split('@')[0] === 'mohammad0900' && <button className={tab === 'support' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('support')}><ShieldCheck size={19}/> مدیریت و پشتیبانی</button>}
      </nav>
      <div className="sidebar-bottom"><div className="online-dot"/> وایرو در حال رشد است <span>●</span></div>
    </aside>

    <main className="feed" id="top">
      <header className="topbar"><div><span className="eyebrow">یک جای تازه برای تو</span><h1>{title}</h1></div><button className="icon-btn" aria-label="اعلان‌ها" onClick={() => navigate('activity')}><Bell size={19}/><i/></button></header>
      {!supabaseReady && <div className="setup-banner"><ShieldCheck size={18}/><span><b>حالت پیش‌نمایش</b><small>برای ورود و ذخیره‌سازی آنلاین، اتصال Supabase باید در فرایند ساخت تنظیم شود.</small></span></div>}
      {notice && <div className="notice toast"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="بستن اعلان"><X size={17}/></button><div className="toast-progress"/></div>}

      {(tab === 'explore' || tab === 'home') && <>
        {tab === 'explore' && <section className="welcome-card"><div className="welcome-copy"><span className="pill"><Sparkles size={13}/> نسل تازه ارتباط</span><h2>کشف کن.<br/><em>متفاوت باش.</em></h2><p>آدم‌ها، ایده‌ها و حال‌وهوای تازه را در دنیای وایرو پیدا کن.</p><button className="welcome-cta" onClick={() => document.getElementById('composer')?.focus()}>یک چیزی به اشتراک بذار <Plus size={17}/></button></div><div className="orb-wrap"><div className="orb">V<span>YRO</span></div><div className="orbit orbit-one"/><div className="orbit orbit-two"/><span className="spark s1">✦</span><span className="spark s2">✧</span></div></section>}
        {tab === 'home' && <section className="home-intro"><span className="pill"><Sparkles size={13}/> فید شخصی تو</span><h2>سلام، خوش اومدی 💛</h2><p>تازه‌ترین پست‌ها از جامعهٔ وایرو اینجا هستند.</p></section>}
        <section className="composer card"><div className="composer-top"><div className="avatar">{session?.user?.email?.[0]?.toUpperCase() || 'V'}</div><textarea id="composer" value={composer} onChange={e => setComposer(e.target.value)} placeholder="چه چیزی توی ذهنته؟" rows={2}/></div><div className="composer-bottom"><span className="subtle"><ImagePlus size={16}/> عکس و ویدیو به‌زودی</span><button className="primary-btn" onClick={publish} disabled={!composer.trim()}><Send size={16}/> انتشار</button></div></section>
        <div className="section-heading"><div><span className="eyebrow">{tab === 'explore' ? 'پیشنهاد برای تو' : 'از جامعه وایرو'}</span><h2>{tab === 'explore' ? 'تازه‌ها و آدم‌های جدید' : 'پست‌های اخیر'}</h2></div></div>
        <div className="stories"><button className="story own" onClick={() => setNotice('ساخت استوری هنوز به اتصال رسانه نیاز دارد.')}><div className="story-ring"><span>+</span></div><small>استوری تو</small></button><button className="story" onClick={() => setNotice('نمایش استوری‌ها هنوز در حال توسعه است.')}><div className="story-ring lime"><span>V</span></div><small>vyro.team</small></button><button className="story" onClick={() => setNotice('نمایش استوری‌ها هنوز در حال توسعه است.')}><div className="story-ring violet"><span>M</span></div><small>mood.daily</small></button><button className="story" onClick={() => setNotice('نمایش استوری‌ها هنوز در حال توسعه است.')}><div className="story-ring orange"><span>A</span></div><small>art.space</small></button></div>
        <div className="post-list">{posts.map((post, i) => <article className="post card" key={post.id}><div className="post-head"><div className={'avatar ' + (i % 2 ? 'violet-bg' : '')}>{(post.display_name || 'V').slice(0,1)}</div><div className="post-user"><b>{post.display_name}</b><span>@{post.username} · {post.time}</span></div><button className="more-btn" onClick={() => setNotice('گزینه‌های گزارش و مدیریت پست در حال توسعه است.')}>•••</button></div><p className="post-text">{post.content}</p><div className="post-actions"><button className={liked.includes(post.id) ? 'liked' : ''} onClick={() => {setLiked(liked.includes(post.id) ? liked.filter(id => id !== post.id) : [...liked, post.id]);}}><Heart size={17} fill={liked.includes(post.id) ? 'currentColor' : 'none'}/> {post.likes + (liked.includes(post.id) ? 1 : 0)}</button><button onClick={() => setNotice('بخش نظرها در مرحلهٔ بعدی به بک‌اند متصل می‌شود.')}><MessageCircle size={17}/> پاسخ</button><button onClick={() => setNotice('برای اشتراک‌گذاری، این قابلیت در نسخهٔ بعدی تکمیل می‌شود.')}><Send size={16}/> ارسال</button></div></article>)}</div>
      </>}

      {tab === 'messages' && <section className="chat-layout card"><div className="chat-list"><div className="chat-list-head"><h2>گفت‌وگوها</h2><button className="icon-btn small-icon" onClick={() => setNotice('ساخت گفت‌وگوی جدید پس از اتصال چت آنلاین فعال می‌شود.')}><Plus size={17}/></button></div><label className="search-box"><Search size={16}/><input placeholder="جست‌وجوی گفتگو" /></label>{conversations.map(c => <button key={c.id} className={'conversation ' + (chatId === c.id ? 'selected' : '')} onClick={() => setChatId(c.id)}><span className="chat-avatar">{c.avatar}</span><span className="conversation-copy"><b>{c.name}</b><small>{c.last}</small></span><span className="conversation-meta"><small>{c.time}</small>{c.unread > 0 && <i>{c.unread}</i>}</span></button>)}</div><div className="chat-window"><div className="chat-top"><button className="back-chat" onClick={() => setTab('messages')}><ChevronLeft size={18}/></button><span className="chat-avatar">{conversations.find(c => c.id === chatId)?.avatar || 'V'}</span><div><b>{conversations.find(c => c.id === chatId)?.name || 'گفت‌وگو'}</b><small><i/> گفت‌وگوی آزمایشی</small></div></div><div className="chat-body"><div className="chat-day">امروز</div>{chatMessages.map((m,i) => <div key={i} className={'message-bubble ' + m.from}><p>{m.text}</p><small>{m.time}</small></div>)}</div><form className="chat-compose" onSubmit={sendChat}><button type="button" aria-label="پیوست" onClick={() => setNotice('ارسال فایل در حال توسعه است.')}><Paperclip size={18}/></button><input value={chatDraft} onChange={e => setChatDraft(e.target.value)} placeholder="پیامت رو بنویس..." /><button type="button" aria-label="ضبط صدا" onClick={() => setNotice('پیام صوتی در نسخهٔ بعدی اضافه می‌شود.')}><Mic size={18}/></button><button className="send-chat" type="submit" aria-label="ارسال پیام"><Send size={17}/></button></form><div className="chat-disclaimer">این گفت‌وگو فعلاً نمایشی است و هنوز به پیام‌رسانی زنده متصل نیست.</div></div></section>}

      {tab === 'activity' && <section className="simple-panel card"><span className="feature-icon"><Bell size={24}/></span><h2>اعلان‌های تو</h2><p>وقتی کسی با پست‌ها یا پروفایلت تعامل کند، اعلان‌ها اینجا نمایش داده می‌شوند.</p><div className="empty-state">فعلاً اعلان تازه‌ای نداری ✨</div></section>}
      {tab === 'music' && <section className="simple-panel card"><span className="feature-icon"><Headphones size={24}/></span><h2>موسیقی وایرو</h2><p>موسیقی‌هایی که حال‌وهوات رو می‌سازن، اینجا کنار هم جمع می‌شن.</p><div className="music-feature"><div className="album-art"><Music2 size={36}/></div><div><b>میکس روز تو</b><small>فضای موسیقی وایرو</small><span>پخش آنلاین در مرحلهٔ بعدی فعال می‌شود</span></div><button className="round-play" onClick={() => setNotice('پخش موسیقی هنوز به سرویس صوتی متصل نشده است.')}>▶</button></div></section>}
      {tab === 'ai' && <section className="simple-panel card ai-panel"><span className="feature-icon"><Bot size={24}/></span><h2>دستیار هوشمند وایرو</h2><p>برای ایدهٔ پست، کپشن یا الهام گرفتن از دستیار کمک بگیر.</p><div className="ai-suggestions"><button onClick={() => setAiPrompt('برای یک عکس غروب، کپشن کوتاه پیشنهاد بده')}>ایدهٔ کپشن</button><button onClick={() => setAiPrompt('برای شروع یک پست خلاقانه ایده بده')}>ایدهٔ پست</button><button onClick={() => setAiPrompt('یک جملهٔ انرژی‌بخش بنویس')}>حال خوب</button></div><form onSubmit={e => {e.preventDefault(); if(aiPrompt.trim()) setAiReply('این بخش هنوز به سرویس هوش مصنوعی متصل نشده؛ ایده‌ات ذخیره شد تا بعد از اتصال پاسخ واقعی دریافت کنی.');}} className="ai-compose"><input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="از وایرو AI چیزی بپرس..." /><button className="primary-btn"><Send size={16}/></button></form>{aiReply && <div className="ai-reply">{aiReply}</div>}</section>}
      {tab === 'settings' && <section className="settings-panel card"><span className="eyebrow">شخصی‌سازی تجربه</span><h2>تنظیمات وایرو</h2><div className="setting-row"><div><b>صفحهٔ شروع برنامه</b><p>انتخاب کن با باز شدن وایرو کدام صفحه را ببینی.</p></div><div className="segmented"><button className={startTab === 'explore' ? 'chosen' : ''} onClick={() => saveStartTab('explore')}><Compass size={15}/> اکسپلور</button><button className={startTab === 'home' ? 'chosen' : ''} onClick={() => saveStartTab('home')}><Home size={15}/> خانه</button></div></div><div className="setting-row"><div><b>حساب کاربری</b><p>{session ? 'حساب تو متصل است.' : 'برای امکانات آنلاین وارد حساب شو.'}</p></div><button className="primary-btn" onClick={() => {setAuthMode('login');setAuthOpen(true)}}>{session ? 'حساب من' : 'ورود / ثبت‌نام'} <LogIn size={15}/></button></div><div className="setting-row"><div><b>اعلان‌های روی صفحه</b><p>اعلان‌های داخل برنامه ۳ ثانیه نمایش داده می‌شوند و با × هم بسته می‌شوند.</p></div><span className="setting-status">فعال</span></div></section>}
      {tab === 'profile' && <section className="profile-card"><div className="profile-cover"/><div className="avatar large">{session?.user?.email?.[0]?.toUpperCase() || 'V'}</div><h2>{session?.user?.email?.split('@')[0] || 'مهمان وایرو'}</h2><p>{session ? 'عضو وایرو' : 'برای ساخت پروفایل وارد حساب شو'}</p><button className="primary-btn" onClick={() => {setAuthMode('login');setAuthOpen(true)}}>{session ? 'حساب متصل است' : 'ورود / ثبت‌نام'} <LogIn size={17}/></button></section>}
      {tab === 'support' && <section className="settings-panel card"><span className="feature-icon"><ShieldCheck size={24}/></span><h2>مدیریت و پشتیبانی</h2><p>این پنل فقط برای حساب مدیریتی نمایش داده می‌شود. ابزارهای حذف کاربر، گزارش‌ها و مدیریت نشست‌ها هنوز باید امن و سمت سرور پیاده‌سازی شوند.</p><div className="empty-state">پنل مدیریتی کامل هنوز فعال نیست.</div></section>}

      <footer>VYRO © 2026 <span>ساخته‌شده برای ارتباط واقعی</span></footer>
    </main>

    <aside className="right-panel"><div className="right-head"><span className="eyebrow">حساب کاربری</span><button className="login-link" onClick={() => {setAuthMode('login');setAuthOpen(true)}}>{session ? 'حساب من' : 'ورود'} <LogIn size={15}/></button></div><div className="mini-profile"><div className="mini-avatar">V</div><div><b>{session?.user?.email?.split('@')[0] || 'مهمان'}</b><span>{session ? 'عضو وایرو' : 'به جمع ما بپیوند'}</span></div></div><div className="join-card"><Sparkles size={20}/><h3>داستان تو از اینجا شروع می‌شه</h3><p>حساب بساز و بخشی از جامعه تازه وایرو باش.</p><button onClick={() => {setAuthMode('signup');setAuthOpen(true)}}>ساخت حساب <Plus size={16}/></button></div><div className="trend-card"><h3>ترندهای وایرو <span>↗</span></h3><div><small>محبوب در وایرو</small><b>#شروع_تازه</b><span>۱۲۸ پست</span></div><div><small>جامعه خلاق</small><b>#حال_خوب</b><span>۸۶ پست</span></div><div><small>این هفته</small><b>#دنیای_من</b><span>۴۲ پست</span></div></div><div className="safety-note"><ShieldCheck size={17}/><span>فضایی برای ارتباط محترمانه و امن.</span></div></aside>

    {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><form className="auth-modal" onSubmit={authenticate} onClick={e => e.stopPropagation()}><button type="button" className="close-modal" onClick={() => setAuthOpen(false)}><X size={18}/></button><div className="brand modal-brand"><span className="brand-mark">V</span><span>VYRO<span className="brand-dot">.</span></span></div><h2>{authMode === 'login' ? 'خوش برگشتی' : 'به وایرو بپیوند'}</h2><p>با حساب خودت وارد دنیای وایرو شو.</p><label>ایمیل<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required/></label><label>رمز عبور<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="حداقل ۶ کاراکتر" minLength={6} required/></label><button className="primary-btn submit-auth" disabled={busy}>{busy ? 'لطفاً صبر کن…' : authMode === 'login' ? 'ورود به حساب' : 'ساخت حساب'} <LogIn size={16}/></button>{notice && <div className="auth-notice">{notice}</div>}<button type="button" className="switch-auth" onClick={() => {setAuthMode(authMode === 'login' ? 'signup' : 'login');setNotice('')}}>{authMode === 'login' ? 'حساب نداری؟ ثبت‌نام کن' : 'حساب داری؟ وارد شو'}</button></form></div>}
    <nav className="mobile-nav"><button className={tab === 'explore' ? 'mobile-active' : ''} onClick={() => navigate('explore')}><Compass size={20}/><small>اکسپلور</small></button><button className={tab === 'home' ? 'mobile-active' : ''} onClick={() => navigate('home')}><Home size={20}/><small>خانه</small></button><button className="mobile-plus" onClick={() => {navigate(startTab);document.getElementById('composer')?.focus()}}><Plus size={22}/></button><button className={tab === 'messages' ? 'mobile-active' : ''} onClick={() => navigate('messages')}><MessageCircle size={20}/><small>چت</small></button><button className={tab === 'profile' ? 'mobile-active' : ''} onClick={() => navigate('profile')}><UserRound size={20}/><small>پروفایل</small></button></nav>
  </div>;
}