import { useEffect, useState } from 'react';
import { Activity, Bell, Compass, Heart, Home, ImagePlus, LogIn, MessageCircle, Plus, Send, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react';
import { supabase, supabaseReady } from './lib/supabase';

const demoPosts = [
  { id: 'demo-1', username: 'vyro.team', display_name: 'VYRO Studio', time: 'همین حالا', content: 'اینجا شروع یک ارتباط تازه است. ✨\nبه وایرو خوش آمدی؛ خودت باش، بی‌مرز بدرخش.', likes: 128, accent: 'lime' },
  { id: 'demo-2', username: 'mood.daily', display_name: 'Mood Daily', time: '۲ ساعت پیش', content: 'گاهی بهترین اتفاق، اینه که برای چند دقیقه همه‌چیز رو آروم کنی و فقط نفس بکشی. 🌙', likes: 64, accent: 'purple' }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [posts, setPosts] = useState(demoPosts);
  const [tab, setTab] = useState('home');
  const [composer, setComposer] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

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
        if (data && !error) setPosts(data.map(p => ({
          id: p.id, username: p.profiles?.username || 'vyro_user',
          display_name: p.profiles?.display_name || 'عضو وایرو',
          time: new Date(p.created_at).toLocaleString('fa-IR'),
          content: p.content || '', likes: 0
        })));
      });
  }, [session]);

  async function authenticate(e) {
    e.preventDefault(); setBusy(true); setNotice('');
    if (!supabaseReady) { setNotice('برای فعال‌سازی حساب، متغیرهای Supabase در تنظیمات ساخت باید اضافه شوند.'); setBusy(false); return; }
    const action = authMode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error } = await action;
    setNotice(error ? error.message : (authMode === 'login' ? 'ورود موفق بود.' : 'حساب ساخته شد؛ اگر تأیید ایمیل فعال است، ایمیلت را بررسی کن.'));
    setBusy(false);
  }

  async function publish() {
    const content = composer.trim();
    if (!content) return;
    if (!session || !supabaseReady) {
      setPosts([{ id: String(Date.now()), username: 'you', display_name: 'پیش‌نمایش شما', time: 'همین حالا', content, likes: 0 }, ...posts]);
      setComposer('');
      if (!session) setNotice('این پست فقط در پیش‌نمایش همین صفحه است؛ برای ذخیره واقعی وارد حساب شو.');
      return;
    }
    const { error } = await supabase.from('posts').insert({ user_id: session.user.id, content });
    if (error) setNotice(error.message);
    else {
      setPosts([{ id: String(Date.now()), username: session.user.email?.split('@')[0] || 'you', display_name: 'شما', time: 'همین حالا', content, likes: 0 }, ...posts]);
      setComposer(''); setNotice('پست منتشر شد.');
    }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={() => setTab('home')}><span className="brand-mark">V</span><span>VYRO<span className="brand-dot">.</span></span></a>
      <div className="side-caption">فضای تو، دنیای تو</div>
      <nav>
        <button className={tab === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => setTab('home')}><Home size={19}/> خانه</button>
        <button className={tab === 'explore' ? 'nav-item active' : 'nav-item'} onClick={() => setTab('explore')}><Compass size={19}/> کاوش</button>
        <button className={tab === 'messages' ? 'nav-item active' : 'nav-item'} onClick={() => {setTab('messages');setNotice('بخش پیام‌ها در مرحله بعدی توسعه فعال می‌شود.');}}><MessageCircle size={19}/> پیام‌ها <span className="soon">به‌زودی</span></button>
        <button className={tab === 'activity' ? 'nav-item active' : 'nav-item'} onClick={() => {setTab('activity');setNotice('اعلان‌ها در مرحله بعدی توسعه فعال می‌شوند.');}}><Bell size={19}/> اعلان‌ها</button>
        <button className={tab === 'profile' ? 'nav-item active' : 'nav-item'} onClick={() => setTab('profile')}><UserRound size={19}/> پروفایل</button>
      </nav>
      <div className="sidebar-bottom"><div className="online-dot"/> وایرو در حال رشد است <span>●</span></div>
    </aside>

    <main className="feed">
      <header className="topbar"><div><span className="eyebrow">یک جای تازه برای تو</span><h1>{tab === 'explore' ? 'کشف کن' : tab === 'profile' ? 'پروفایل تو' : 'فید تو'}</h1></div><button className="icon-btn" aria-label="اعلان‌ها" onClick={() => setNotice('اعلان‌ها به‌زودی فعال می‌شوند.')}><Bell size={19}/><i/></button></header>
      {!supabaseReady && <div className="setup-banner"><ShieldCheck size={18}/><span><b>حالت پیش‌نمایش</b><small>برای ورود و ذخیره‌سازی آنلاین، اتصال Supabase باید در فرایند ساخت تنظیم شود.</small></span></div>}
      {notice && <div className="notice">{notice}<button onClick={() => setNotice('')} aria-label="بستن"><X size={15}/></button></div>}
      {tab === 'profile' ? <section className="profile-card"><div className="profile-cover"/><div className="avatar large">{session?.user?.email?.[0]?.toUpperCase() || 'V'}</div><h2>{session?.user?.email?.split('@')[0] || 'مهمان وایرو'}</h2><p>{session ? 'عضو وایرو' : 'برای ساخت پروفایل وارد حساب شو'}</p><button className="primary-btn" onClick={() => {setAuthMode('login');setAuthOpen(true)}}>{session ? 'حساب متصل است' : 'ورود / ثبت‌نام'} <LogIn size={17}/></button></section> : <>
        <section className="welcome-card"><div className="welcome-copy"><span className="pill"><Sparkles size={13}/> نسل تازه ارتباط</span><h2>خودت باش.<br/><em>بدرخش.</em></h2><p>لحظه‌هات رو به اشتراک بذار و آدم‌های هم‌دنیات رو پیدا کن.</p><button className="welcome-cta" onClick={() => document.getElementById('composer')?.focus()}>شروع کن <Plus size={17}/></button></div><div className="orb-wrap"><div className="orb">V<span>YRO</span></div><div className="orbit orbit-one"/><div className="orbit orbit-two"/><span className="spark s1">✦</span><span className="spark s2">✧</span></div></section>
        <section className="composer card"><div className="composer-top"><div className="avatar">{session?.user?.email?.[0]?.toUpperCase() || 'V'}</div><textarea id="composer" value={composer} onChange={e => setComposer(e.target.value)} placeholder="چه چیزی توی ذهنته؟" rows={2}/></div><div className="composer-bottom"><span className="subtle"><ImagePlus size={16}/> عکس و ویدیو به‌زودی</span><button className="primary-btn" onClick={publish} disabled={!composer.trim()}><Send size={16}/> انتشار</button></div></section>
        <div className="section-heading"><div><span className="eyebrow">از جامعه وایرو</span><h2>{tab === 'explore' ? 'چیزهای تازه برای کشف' : 'تازه‌ها برای تو'}</h2></div><button className="text-btn" onClick={() => setTab('explore')}>کاوش <Activity size={15}/></button></div>
        <div className="stories"><div className="story own" onClick={() => setNotice('ساخت استوری در مرحله بعدی فعال می‌شود.')}><div className="story-ring"><span>+</span></div><small>استوری تو</small></div><div className="story" onClick={() => setNotice('استوری‌ها به‌زودی فعال می‌شوند.')}><div className="story-ring lime"><span>V</span></div><small>vyro.team</small></div><div className="story" onClick={() => setNotice('استوری‌ها به‌زودی فعال می‌شوند.')}><div className="story-ring violet"><span>M</span></div><small>mood.daily</small></div><div className="story" onClick={() => setNotice('استوری‌ها به‌زودی فعال می‌شوند.')}><div className="story-ring orange"><span>A</span></div><small>art.space</small></div></div>
        <div className="post-list">{posts.map((post, i) => <article className="post card" key={post.id}><div className="post-head"><div className={'avatar ' + (i % 2 ? 'violet-bg' : '')}>{(post.display_name || 'V').slice(0,1)}</div><div className="post-user"><b>{post.display_name}</b><span>@{post.username} · {post.time}</span></div><button className="more-btn" onClick={() => setNotice('گزینه‌های بیشتر در نسخه بعدی اضافه می‌شوند.')}>•••</button></div><p className="post-text">{post.content}</p><div className="post-actions"><button onClick={() => setNotice('لایک آنلاین در مرحله بعدی اضافه می‌شود.')}><Heart size={17}/> {post.likes || 0}</button><button onClick={() => setNotice('نظرات در مرحله بعدی اضافه می‌شوند.')}><MessageCircle size={17}/> پاسخ</button><button onClick={() => setNotice('اشتراک‌گذاری در مرحله بعدی اضافه می‌شود.')}><Send size={16}/> ارسال</button></div></article>)}</div>
      </>}
      <footer>VYRO © 2026 <span>ساخته‌شده برای ارتباط واقعی</span></footer>
    </main>

    <aside className="right-panel"><div className="right-head"><span className="eyebrow">حساب کاربری</span><button className="login-link" onClick={() => {setAuthMode('login');setAuthOpen(true)}}>{session ? 'حساب من' : 'ورود'} <LogIn size={15}/></button></div><div className="mini-profile"><div className="mini-avatar">V</div><div><b>{session?.user?.email?.split('@')[0] || 'مهمان'}</b><span>{session ? 'عضو وایرو' : 'به جمع ما بپیوند'}</span></div></div><div className="join-card"><Sparkles size={20}/><h3>داستان تو از اینجا شروع می‌شه</h3><p>حساب بساز و بخشی از جامعه تازه وایرو باش.</p><button onClick={() => {setAuthMode('signup');setAuthOpen(true)}}>ساخت حساب <Plus size={16}/></button></div><div className="trend-card"><h3>ترندهای وایرو <span>↗</span></h3><div><small>محبوب در وایرو</small><b>#شروع_تازه</b><span>۱۲۸ پست</span></div><div><small>جامعه خلاق</small><b>#حال_خوب</b><span>۸۶ پست</span></div><div><small>این هفته</small><b>#دنیای_من</b><span>۴۲ پست</span></div></div><div className="safety-note"><ShieldCheck size={17}/><span>فضایی برای ارتباط محترمانه و امن.</span></div></aside>

    {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><form className="auth-modal" onSubmit={authenticate} onClick={e => e.stopPropagation()}><button type="button" className="close-modal" onClick={() => setAuthOpen(false)}><X size={18}/></button><div className="brand modal-brand"><span className="brand-mark">V</span><span>VYRO<span className="brand-dot">.</span></span></div><h2>{authMode === 'login' ? 'خوش برگشتی' : 'به وایرو بپیوند'}</h2><p>با حساب خودت وارد دنیای وایرو شو.</p><label>ایمیل<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required/></label><label>رمز عبور<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="حداقل ۶ کاراکتر" minLength={6} required/></label><button className="primary-btn submit-auth" disabled={busy}>{busy ? 'لطفاً صبر کن…' : authMode === 'login' ? 'ورود به حساب' : 'ساخت حساب'} <LogIn size={16}/></button>{notice && <div className="auth-notice">{notice}</div>}<button type="button" className="switch-auth" onClick={() => {setAuthMode(authMode === 'login' ? 'signup' : 'login');setNotice('')}}>{authMode === 'login' ? 'حساب نداری؟ ثبت‌نام کن' : 'حساب داری؟ وارد شو'}</button></form></div>}
    <nav className="mobile-nav"><button onClick={() => setTab('home')}><Home size={20}/><small>خانه</small></button><button onClick={() => setTab('explore')}><Compass size={20}/><small>کاوش</small></button><button className="mobile-plus" onClick={() => document.getElementById('composer')?.focus()}><Plus size={22}/></button><button onClick={() => setNotice('پیام‌ها به‌زودی فعال می‌شوند.')}><MessageCircle size={20}/><small>پیام‌ها</small></button><button onClick={() => setTab('profile')}><UserRound size={20}/><small>پروفایل</small></button></nav>
  </div>;
}