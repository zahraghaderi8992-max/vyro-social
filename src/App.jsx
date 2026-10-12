import { useEffect, useState } from 'react';
import { Bell, Compass, Heart, ImagePlus, LogIn, MessageCircle, Plus, Send, ShieldCheck, Sparkles, UserRound, Settings, X, Search, Paperclip, Mic, Bot, Headphones, ChevronLeft, Users, Radio, LockKeyhole, ArrowRight, LogOut } from 'lucide-react';
import { supabase, supabaseReady } from './lib/supabase';

const seedConversations = [
 { id:'vyro-team', type:'direct', name:'تیم وایرو', handle:'@vyro.team', avatar:'V', last:'به وایرو خوش اومدی ✨', time:'الان', unread:2, messages:[{from:'them',text:'سلام! به دنیای وایرو خوش اومدی 💛',time:'۱۰:۲۰'},{from:'me',text:'ممنون! خوشحالم اینجام ✨',time:'۱۰:۲۱'}]},
 { id:'mina', type:'direct', name:'مینا', handle:'@mina.art', avatar:'م', last:'اون عکس خیلی قشنگ بود!', time:'۱۰ دقیقه', unread:0, messages:[{from:'them',text:'سلام، پست جدیدت رو دیدم!',time:'۱۰:۰۵'},{from:'me',text:'مرسی مینا جان 💛',time:'۱۰:۰۶'},{from:'them',text:'اون عکس خیلی قشنگ بود!',time:'۱۰:۱۰'}]},
 { id:'arian', type:'direct', name:'آرین', handle:'@arian.music', avatar:'آ', last:'بعداً برات می‌فرستم 🎧', time:'۱ ساعت', unread:0, messages:[{from:'me',text:'اون پلی‌لیست رو داری؟',time:'۰۹:۱۰'},{from:'them',text:'آره، بعداً برات می‌فرستم 🎧',time:'۰۹:۱۲'}]}
];
const demoPosts = [
 {id:'demo-1',username:'vyro.team',display_name:'VYRO Studio',time:'همین حالا',content:'اینجا شروع یک ارتباط تازه است. ✨\\nبه وایرو خوش آمدی؛ خودت باش، بی‌مرز بدرخش.',likes:128},
 {id:'demo-2',username:'mood.daily',display_name:'Mood Daily',time:'۲ ساعت پیش',content:'گاهی بهترین اتفاق، اینه که برای چند دقیقه همه‌چیز رو آروم کنی و فقط نفس بکشی. 🌙',likes:64}
];
export default function App(){
 const [session,setSession]=useState(null);
 const [authChecked,setAuthChecked]=useState(false);
 const [posts,setPosts]=useState(demoPosts);
 const [tab,setTab]=useState('explore');
 const [composer,setComposer]=useState('');
 const [authMode,setAuthMode]=useState('welcome');
 const [email,setEmail]=useState('');
 const [composerOpen,setComposerOpen]=useState(false);
 const [mediaFile,setMediaFile]=useState(null);
 const [mediaPreview,setMediaPreview]=useState('');
 const [videoViewer,setVideoViewer]=useState(null);
 const [chatUsername,setChatUsername]=useState('');
 const [password,setPassword]=useState('');
 const [inviteCode,setInviteCode]=useState('');
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 const [conversations,setConversations]=useState(seedConversations);
 const [chatId,setChatId]=useState(null);
 const [chatDraft,setChatDraft]=useState('');
 const [chatKind,setChatKind]=useState('group');
 const [chatName,setChatName]=useState('');
 const [createChatOpen,setCreateChatOpen]=useState(false);
 const [liked,setLiked]=useState([]);
 const [settings,setSettings]=useState({motion:true,toast:true,privateProfile:false});
 const [disabledFeature,setDisabledFeature]=useState('موسیقی');
 useEffect(()=>{if(!notice||!settings.toast)return;const t=setTimeout(()=>setNotice(''),3000);return()=>clearTimeout(t)},[notice,settings.toast]);
 useEffect(()=>{
  if(!supabaseReady){setAuthChecked(true);return}
  supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthChecked(true)});
  const {data:listener}=supabase.auth.onAuthStateChange((_e,next)=>{setSession(next);setAuthChecked(true)});
  return()=>listener.subscription.unsubscribe();
 },[]);
 useEffect(()=>{
  if(!supabaseReady||!session)return;
  supabase.from('posts').select('id,content,created_at,user_id,profiles(username,display_name,avatar_url)').order('created_at',{ascending:false}).limit(30).then(({data,error})=>{
   if(data&&!error&&data.length)setPosts(data.map(p=>({id:p.id,username:p.profiles?.username||'vyro_user',display_name:p.profiles?.display_name||'عضو وایرو',time:new Date(p.created_at).toLocaleString('fa-IR'),content:p.content||'',likes:0})));
  });
 },[session]);
 async function authenticate(e){
  e.preventDefault();setBusy(true);setNotice('');
  if(!supabaseReady){setNotice('اتصال آنلاین آماده نیست. مدیر پروژه باید Secrets مربوط به Supabase را در GitHub تنظیم کند.');setBusy(false);return}
  try{
   if(authMode==='signup'){
    if(!inviteCode.trim()){setNotice('برای ثبت‌نام کد دعوت لازم است.');setBusy(false);return}
    const username=email.trim().replace(/^@/,'').toLowerCase();
    if(!/^[a-z0-9_.]{3,24}$/.test(username))throw new Error('نام کاربری باید ۳ تا ۲۴ حرف انگلیسی، عدد، نقطه یا زیرخط باشد.');
    const {data,error}=await supabase.auth.signUp({email:`${username}@vyro.local`,password,options:{data:{username,invite_code:inviteCode.trim()}}});
    if(error)throw error;
    setNotice(data.session?'ثبت‌نام انجام شد.':'حساب ساخته شد. حالا با نام کاربری و رمزت وارد شو.');
   }else{
    const username=email.trim().replace(/^@/,'').toLowerCase();
    if(!/^[a-z0-9_.]{3,24}$/.test(username))throw new Error('نام کاربری را درست وارد کن.');
    const {error}=await supabase.auth.signInWithPassword({email:`${username}@vyro.local`,password});if(error)throw error;setNotice('ورود موفق بود.');
   }
  }catch(err){setNotice(err.message||'خطا در اتصال به حساب آنلاین.')}
  setBusy(false);
 }
 async function logout(){try{if(supabaseReady){const {error}=await supabase.auth.signOut();if(error)throw error;}setSession(null);setAuthMode('welcome');setTab('explore');setChatId(null);setNotice('از حساب خارج شدی.');}catch(err){setNotice('خروج انجام نشد: '+(err.message||'خطای اتصال'));}}
 async function publish(){
  const content=composer.trim();
  if(!content&&!mediaFile){setNotice('متن یا یک فایل برای انتشار انتخاب کن.');return}
  let mediaUrl=mediaPreview;
  if(mediaFile&&session&&supabaseReady){
   try{
    const safeName=mediaFile.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const path=`${session.user.id}/${Date.now()}-${safeName}`;
    const {error:uploadError}=await supabase.storage.from('posts').upload(path,mediaFile,{upsert:false,contentType:mediaFile.type||undefined});
    if(uploadError)throw uploadError;
    mediaUrl=supabase.storage.from('posts').getPublicUrl(path).data.publicUrl;
   }catch(err){setNotice('بارگذاری فایل انجام نشد: '+(err.message||'دسترسی مخزن را بررسی کن.'));return}
  }
  if(session&&supabaseReady){
   const {error}=await supabase.from('posts').insert({user_id:session.user.id,content:content||' '});
   if(error){setNotice('پست ذخیره نشد: '+error.message);return}
  }
  const item={id:String(Date.now()),username:session?.user?.user_metadata?.username||session?.user?.email?.split('@')[0]||'you',display_name:session?'شما':'پیش‌نمایش شما',time:'همین حالا',content,likes:0,media_url:mediaUrl,media_type:mediaFile?.type||''};
  setPosts([item,...posts]);setComposer('');setMediaFile(null);setMediaPreview('');setComposerOpen(false);
  setNotice(session&&supabaseReady?'پست منتشر شد.':'پست در پیش‌نمایش این دستگاه اضافه شد.');
 }
 function chooseMedia(file){
  if(mediaPreview)URL.revokeObjectURL(mediaPreview);
  if(!file){setMediaFile(null);setMediaPreview('');return}
  setMediaFile(file);setMediaPreview(URL.createObjectURL(file));
 }
 async function sendChat(e){
  e?.preventDefault();const value=chatDraft.trim();if(!value||!chatId)return;
  const updated=conversations.map(c=>c.id===chatId?{...c,last:value,time:'همین حالا',messages:[...c.messages,{from:'me',text:value,time:new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})}]}:c);
  setConversations(updated);setChatDraft('');
  setNotice(session?'پیام فعلاً در این نمونه روی همین دستگاه نگه داشته می‌شود؛ پیام‌رسانی زنده هنوز وصل نیست.':'پیام آزمایشی اضافه شد. برای گفت‌وگوی آنلاین وارد حساب شو.');
 }
 function createConversation(e){
  e.preventDefault();const name=(chatKind==='direct'?chatUsername.trim().replace(/^@/,''):chatName.trim());if(!name)return;
  const id='local-'+Date.now();const c={id,type:chatKind,name,handle:chatKind==='direct'?'@'+chatUsername.replace(/^@/,''):chatKind==='group'?'گروه آزمایشی':'کانال آزمایشی',avatar:chatKind==='direct'?name.slice(0,1):chatKind==='group'?'گ':'ک',last:chatKind==='direct'?'گفت‌وگوی خصوصی ایجاد شد':chatKind==='group'?'گروه ساخته شد':'کانال ساخته شد',time:'همین حالا',unread:0,messages:[{from:'them',text:chatKind==='direct'?'گفت‌وگوی خصوصی با @'+chatUsername.replace(/^@/,'')+' آماده است. پیام‌رسانی زنده هنوز فعال نیست.':chatKind==='group'?'گروه آزمایشی ساخته شد. اعضا را بعداً می‌توان اضافه کرد.':'کانال آزمایشی ساخته شد. انتشار آنلاین بعداً فعال می‌شود.',time:'الان'}]};
  setConversations([c,...conversations]);setChatId(id);setChatName('');setChatUsername('');setCreateChatOpen(false);setNotice('این '+(chatKind==='group'?'گروه':'کانال')+' فعلاً فقط در پیش‌نمایش ساخته شد.');
 }
 const title=({explore:'اکسپلور',messages:'چت',activity:'اعلان‌ها',profile:'پروفایل',settings:'تنظیمات',music:'موسیقی',ai:'دستیار هوشمند'})[tab]||'اکسپلور';
 if(!authChecked)return <div className="auth-first" dir="rtl"><div className="brand-mark big-mark">V</div><h1>VYRO<span>.</span></h1><p>در حال آماده‌سازی فضای تو…</p></div>;
 if(!session&&authMode!=='guest')return <div className="auth-first" dir="rtl">
  <div className="auth-glow"></div><div className="welcome-logo"><div className="brand-mark big-mark">V</div><span className="wordmark">VYRO<span>.</span></span></div>
  <div className="welcome-symbol"><div className="welcome-orbit"></div><Sparkles size={31}/></div>
  <span className="eyebrow">فضای تو، دنیای تو</span><h1>{authMode==='welcome'?'وایرو؛ ارتباط به سبک تو':authMode==='signup'?'با دعوت وارد شو.':'خوش برگشتی.'}</h1>
  <p className="welcome-desc">{authMode==='welcome'?'به وایرو خوش اومدی؛ جایی برای آدم‌ها، ایده‌ها و ارتباط‌های تازه.':authMode==='signup'?'فقط نام کاربری، رمز عبور و کد دعوت لازم داری.':'با حساب وایرو ادامه بده.'}</p>
  {authMode==='welcome'?<div className="welcome-actions"><button className="primary-btn" onClick={()=>setAuthMode('signup')}>ثبت‌نام با کد دعوت <ArrowRight size={17}/></button><button className="secondary-btn" onClick={()=>setAuthMode('login')}>از قبل حساب دارم؛ ورود</button></div>:<form className="auth-form" onSubmit={authenticate}>
   <button type="button" className="auth-back" onClick={()=>setAuthMode('welcome')}><ChevronLeft size={17}/> بازگشت</button>
   {authMode==='signup'&&<label>کد دعوت<input value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="کد دعوت را وارد کن" autoCapitalize="characters" required/></label>}
   <label>نام کاربری<input type="text" value={email} onChange={e=>setEmail(e.target.value)} placeholder="مثلاً mohammad0900" autoCapitalize="none" autoComplete="username" minLength={3} maxLength={24} required/></label>
   <label>رمز عبور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="حداقل ۶ کاراکتر" autoComplete={authMode==='signup'?'new-password':'current-password'} minLength={6} required/></label>
   <button className="primary-btn submit-auth" disabled={busy}>{busy?'لطفاً صبر کن…':authMode==='signup'?'ساخت حساب با دعوت':'ورود به وایرو'} <LogIn size={16}/></button>
   {!supabaseReady&&<small className="auth-help"></small>}
   {notice&&<div className="auth-notice">{notice}</div>}
   <button type="button" className="switch-auth" onClick={()=>{setAuthMode(authMode==='signup'?'login':'signup');setNotice('')}}>{authMode==='signup'?'حساب داری؟ وارد شو':'حساب نداری؟ ثبت‌نام با کد دعوت'}</button>
  </form>}
 </div>;
 return <div className={'app-shell '+(settings.motion?'motion-on':'motion-off')} dir="rtl">
  <aside className="sidebar"><a className="brand" href="#top" onClick={e=>{e.preventDefault();setTab('explore')}}><span className="brand-mark">V</span><span>VYRO<span className="brand-dot">.</span></span></a><div className="side-caption">فضای تو، دنیای تو</div>
   <nav><button className={tab==='explore'?'nav-item active':'nav-item'} onClick={()=>setTab('explore')}><Compass size={19}/> اکسپلور</button><button className={tab==='messages'?'nav-item active':'nav-item'} onClick={()=>{setTab('messages');setChatId(null)}}><MessageCircle size={19}/> چت</button><button className={tab==='activity'?'nav-item active':'nav-item'} onClick={()=>setTab('activity')}><Bell size={19}/> اعلان‌ها</button><button className={tab==='music'?'nav-item active':'nav-item'} onClick={()=>{setTab('music');setDisabledFeature('موسیقی')}}><Headphones size={19}/> موسیقی <span className="soon">به‌زودی</span></button><button className={tab==='ai'?'nav-item active':'nav-item'} onClick={()=>{setTab('ai');setDisabledFeature('دستیار هوشمند')}}><Bot size={19}/> دستیار هوشمند <span className="soon">به‌زودی</span></button><button className={tab==='profile'?'nav-item active':'nav-item'} onClick={()=>setTab('profile')}><UserRound size={19}/> پروفایل</button><button className={tab==='settings'?'nav-item active':'nav-item'} onClick={()=>setTab('settings')}><Settings size={19}/> تنظیمات</button>{(session.user?.user_metadata?.username||session.user?.email?.split('@')[0])==='mohammad0900'&&<button className={tab==='support'?'nav-item active':'nav-item'} onClick={()=>setTab('support')}><ShieldCheck size={19}/> مدیریت</button>}</nav>
   <div className="sidebar-bottom"><div className="online-dot"/> وایرو در حال رشد است</div>
  </aside>
  <main className="feed" id="top"><header className="topbar"><div><span className="eyebrow">یک جای تازه برای تو</span><h1>{chatId&&tab==='messages'?conversations.find(c=>c.id===chatId)?.name:title}</h1></div><button className="icon-btn" aria-label="اعلان‌ها" onClick={()=>setTab('activity')}><Bell size={19}/><i/></button></header>
   {!supabaseReady&&<div className="setup-banner"><ShieldCheck size={18}/><span><b>حالت پیش‌نمایش</b><small>برای حساب و ذخیره‌سازی آنلاین، Secrets اتصال Supabase باید در GitHub تنظیم شود.</small></span></div>}
   {notice&&settings.toast&&<div className="notice toast"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="بستن اعلان"><X size={17}/></button><div className="toast-progress"/></div>}
   {tab==='explore'&&<>
    <div className="section-heading explore-heading"><div><span className="eyebrow">برای تو</span><h2>تازه‌ها در وایرو</h2></div><button className="new-post-btn" onClick={()=>setComposerOpen(true)}><ImagePlus size={17}/> پست جدید</button></div>
    <div className="stories"><button className="story own" onClick={()=>setNotice('ساخت استوری در نسخهٔ آزمایشی غیرفعال است.')}><div className="story-ring"><span>+</span></div><small>استوری تو</small></button><button className="story" onClick={()=>setNotice('استوری‌ها فعلاً نمایشی هستند.')}><div className="story-ring lime"><span>V</span></div><small>vyro.team</small></button><button className="story" onClick={()=>setNotice('استوری‌ها فعلاً نمایشی هستند.')}><div className="story-ring violet"><span>M</span></div><small>mood.daily</small></button><button className="story disabled-story" onClick={()=>setNotice('بخش ویدیوهای کوتاه فعلاً غیرفعال است.')}><div className="story-ring orange"><span>▶</span></div><small>ویدیوها · به‌زودی</small></button></div>
    <div className="post-list">{posts.map((post,i)=><article className="post card" key={post.id}><div className="post-head"><div className={'avatar '+(i%2?'violet-bg':'')}>{(post.display_name||'V').slice(0,1)}</div><div className="post-user"><b>{post.display_name}</b><span>@{post.username} · {post.time}</span></div><button className="more-btn" onClick={()=>setNotice('گزارش و مدیریت پست فعلاً غیرفعال است.')}>•••</button></div>{post.content&&<p className="post-text">{post.content}</p>}{post.media_url&&<div className="post-media" onClick={()=>setVideoViewer(post)} role="button" tabIndex={0}>{post.media_type?.startsWith('video/')?<video src={post.media_url} muted playsInline preload="metadata"/>:<img src={post.media_url} alt="رسانهٔ پست"/>}{post.media_type?.startsWith('video/')&&<span className="media-play">▶</span>}</div>}<div className="post-actions"><button className={liked.includes(post.id)?'liked':''} onClick={()=>setLiked(liked.includes(post.id)?liked.filter(id=>id!==post.id):[...liked,post.id])}><Heart size={17} fill={liked.includes(post.id)?'currentColor':'none'}/> {post.likes+(liked.includes(post.id)?1:0)}</button><button onClick={()=>setNotice('نظرها در نسخهٔ آزمایشی غیرفعال هستند.')}><MessageCircle size={17}/> پاسخ</button><button onClick={()=>setNotice('اشتراک‌گذاری فعلاً غیرفعال است.')}><Send size={16}/> ارسال</button></div></article>)}</div>
   </>}
   {tab==='messages'&&<section className={'chat-layout card '+(chatId?'chat-open':'chat-list-only')}>
    {!chatId?<div className="chat-list full-chat-list"><div className="chat-list-head"><h2>گفت‌وگوها</h2><button className="icon-btn small-icon" onClick={()=>setCreateChatOpen(true)} aria-label="ساخت گروه یا کانال"><Plus size={17}/></button></div><label className="search-box"><Search size={16}/><input placeholder="جست‌وجوی گفتگو" onChange={e=>{}}/></label><div className="chat-kind-shortcuts"><button onClick={()=>{setChatKind('direct');setCreateChatOpen(true)}}><MessageCircle size={16}/> گفت‌وگوی خصوصی</button><button onClick={()=>{setChatKind('group');setCreateChatOpen(true)}}><Users size={16}/> ساخت گروه</button><button onClick={()=>{setChatKind('channel');setCreateChatOpen(true)}}><Radio size={16}/> ساخت کانال</button></div>{conversations.map(c=><button key={c.id} className="conversation" onClick={()=>setChatId(c.id)}><span className="chat-avatar">{c.avatar}</span><span className="conversation-copy"><b>{c.name}</b><small>{c.last}</small></span><span className="conversation-meta"><small>{c.time}</small>{c.unread>0&&<i>{c.unread}</i>}</span></button>)}</div>
    :<div className="chat-window single-chat-window"><div className="chat-top"><button className="back-chat visible-back" onClick={()=>setChatId(null)} aria-label="بازگشت به همه گفتگوها"><ChevronLeft size={21}/></button><span className="chat-avatar">{conversations.find(c=>c.id===chatId)?.avatar||'V'}</span><div><b>{conversations.find(c=>c.id===chatId)?.name||'گفت‌وگو'}</b><small>{conversations.find(c=>c.id===chatId)?.type==='channel'?'کانال آزمایشی':conversations.find(c=>c.id===chatId)?.type==='group'?'گروه آزمایشی':'گفت‌وگوی خصوصی'}</small></div><button className="chat-more" onClick={()=>setNotice('تنظیمات گفتگو بعد از اتصال آنلاین فعال می‌شود.')}>•••</button></div><div className="chat-body"><div className="chat-day">امروز</div>{(conversations.find(c=>c.id===chatId)?.messages||[]).map((m,i)=><div key={i} className={'message-bubble '+m.from}><p>{m.text}</p><small>{m.time}</small></div>)}</div><form className="chat-compose" onSubmit={sendChat}><button type="button" aria-label="پیوست" onClick={()=>setNotice('ارسال فایل فعلاً غیرفعال است.')}><Paperclip size={18}/></button><input value={chatDraft} onChange={e=>setChatDraft(e.target.value)} placeholder="پیامت رو بنویس..."/><button type="button" aria-label="ضبط صدا" onClick={()=>setNotice('پیام صوتی فعلاً غیرفعال است.')}><Mic size={18}/></button><button className="send-chat" type="submit" aria-label="ارسال پیام"><Send size={17}/></button></form><div className="chat-disclaimer">پیام‌ها در این نسخه محلی و آزمایشی‌اند؛ هنوز به پیام‌رسانی زنده متصل نیستند.</div></div>}
   </section>}
   {tab==='activity'&&<section className="simple-panel card"><span className="feature-icon"><Bell size={24}/></span><h2>اعلان‌های تو</h2><p>نمای بخش اعلان‌ها آماده است؛ دریافت اعلان واقعی فعلاً غیرفعال است.</p><div className="empty-state">فعلاً اعلان تازه‌ای نداری ✨</div></section>}
   {tab==='music'&&<section className="simple-panel card disabled-feature"><span className="feature-icon"><Headphones size={24}/></span><span className="disabled-label">به‌زودی · غیرفعال</span><h2>موسیقی وایرو</h2><p>بخش‌بندی و جایگاه موسیقی آماده است، اما پخش آنلاین در نسخهٔ آزمایشی فعال نیست.</p><button className="secondary-btn" onClick={()=>setNotice('موسیقی هنوز فعال نشده است.')}>این بخش فعلاً غیرفعال است</button></section>}
   {tab==='ai'&&<section className="simple-panel card disabled-feature"><span className="feature-icon"><Bot size={24}/></span><span className="disabled-label">به‌زودی · غیرفعال</span><h2>دستیار هوشمند وایرو</h2><p>جایگاه دستیار در برنامه قرار دارد، اما تا اتصال سرویس هوش مصنوعی غیرفعال می‌ماند.</p><button className="secondary-btn" onClick={()=>setNotice('دستیار هوشمند هنوز فعال نشده است.')}>این بخش فعلاً غیرفعال است</button></section>}
   {tab==='settings'&&<section className="settings-panel card"><span className="eyebrow">شخصی‌سازی تجربه</span><h2>تنظیمات وایرو</h2><div className="setting-row"><div><b>متحرک‌سازی رابط</b><p>انیمیشن‌های کادر و اجزای برنامه</p></div><button className={'toggle '+(settings.motion?'on':'')} onClick={()=>setSettings({...settings,motion:!settings.motion})}>{settings.motion?'فعال':'خاموش'}</button></div><div className="setting-row"><div><b>اعلان‌های داخل برنامه</b><p>نمایش ۳ ثانیه‌ای با دکمهٔ بستن ×</p></div><button className={'toggle '+(settings.toast?'on':'')} onClick={()=>setSettings({...settings,toast:!settings.toast})}>{settings.toast?'فعال':'خاموش'}</button></div><div className="setting-row"><div><b>حساب کاربری</b><p>@{session.user?.user_metadata?.username||session.user.email?.split('@')[0]}</p></div><button className="secondary-btn logout-btn" onClick={logout}><LogOut size={15}/> خروج از حساب</button></div><div className="setting-row"><div><b>حریم خصوصی</b><p>تنظیم پروفایل خصوصی (نمایشی)</p></div><button className={'toggle '+(settings.privateProfile?'on':'')} onClick={()=>setSettings({...settings,privateProfile:!settings.privateProfile})}>{settings.privateProfile?'خصوصی':'عمومی'}</button></div><div className="setting-row"><div><b>قابلیت‌های رسانه</b><p>استوری، ویدیو، ارسال فایل و صوت</p></div><span className="disabled-label">فعلاً غیرفعال</span></div></section>}
   {tab==='profile'&&<section className="profile-card"><div className="profile-cover"/><div className="avatar large">{(session.user?.user_metadata?.username||session.user.email)?.[0]?.toUpperCase()||'V'}</div><h2>{session.user?.user_metadata?.username||session.user.email?.split('@')[0]||'عضو وایرو'}</h2><p>@{session.user?.user_metadata?.username||session.user.email?.split('@')[0]}</p><button className="primary-btn" onClick={()=>setNotice('ویرایش پروفایل آنلاین در مرحلهٔ بعدی تکمیل می‌شود.')}>ویرایش پروفایل</button></section>}
   {tab==='support'&&<section className="settings-panel card"><span className="feature-icon"><ShieldCheck size={24}/></span><h2>مدیریت و پشتیبانی</h2><p>پنل مدیریت کامل هنوز پیاده‌سازی نشده است.</p></section>}
   <footer>VYRO © 2026 <span>ساخته‌شده برای ارتباط واقعی</span></footer>
  </main>
  <aside className="right-panel"><div className="right-head"><span className="eyebrow">حساب کاربری</span><span className="online-dot"/></div><div className="mini-profile"><div className="mini-avatar">V</div><div><b>@{session.user?.user_metadata?.username||session.user.email?.split('@')[0]||'عضو وایرو'}</b><span>حساب آنلاین</span></div></div><div className="join-card"><Sparkles size={20}/><h3>داستان تو از اینجا شروع می‌شه</h3><p>چیزهای تازه را کشف کن و با جامعه وایرو همراه شو.</p><button onClick={()=>{setTab('explore');document.getElementById('composer')?.focus()}}>ساخت پست <Plus size={16}/></button></div><div className="trend-card"><h3>ترندهای وایرو <span>↗</span></h3><div><small>محبوب در وایرو</small><b>#شروع_تازه</b><span>۱۲۸ پست</span></div><div><small>جامعه خلاق</small><b>#حال_خوب</b><span>۸۶ پست</span></div><div><small>این هفته</small><b>#دنیای_من</b><span>۴۲ پست</span></div></div><div className="safety-note"><ShieldCheck size={17}/><span>فضایی برای ارتباط محترمانه و امن.</span></div></aside>
  {composerOpen&&<div className="modal-backdrop composer-backdrop" onClick={()=>{setComposerOpen(false);setMediaFile(null);setMediaPreview('')}}><form className="composer-modal" onSubmit={e=>{e.preventDefault();publish()}} onClick={e=>e.stopPropagation()}><div className="composer-modal-head"><div><span className="eyebrow">انتشار تازه</span><h2>پست جدید</h2></div><button type="button" className="close-modal" onClick={()=>{setComposerOpen(false);setMediaFile(null);setMediaPreview('')}} aria-label="بستن"><X size={18}/></button></div><div className="composer-modal-user"><span className="avatar">{(session.user?.user_metadata?.username||'V')[0].toUpperCase()}</span><b>@{session.user?.user_metadata?.username||session.user.email?.split('@')[0]||'you'}</b></div><textarea className="post-caption" value={composer} onChange={e=>setComposer(e.target.value)} placeholder={mediaFile?'برای فایل خودت توضیح یا کپشن بنویس…':'متن پستت رو اینجا بنویس…'} rows={5}/>{mediaPreview&&<div className="media-preview">{mediaFile?.type?.startsWith('video/')?<video src={mediaPreview} controls playsInline/>:<img src={mediaPreview} alt="پیش‌نمایش فایل"/>}<button type="button" className="remove-media" onClick={()=>chooseMedia(null)}><X size={15}/> حذف فایل</button></div>}<div className="composer-modal-bottom"><label className="attach-media"><ImagePlus size={18}/> افزودن عکس یا ویدیو<input type="file" accept="image/*,video/*" onChange={e=>chooseMedia(e.target.files?.[0]||null)}/></label><span className="subtle">{mediaFile?mediaFile.name:'متن تنها یا فایل همراه متن'}</span></div><button className="primary-btn publish-btn" type="submit" disabled={!composer.trim()&&!mediaFile}><Send size={17}/> انتشار پست</button></form></div>}
  {videoViewer&&<div className="video-viewer" onClick={()=>setVideoViewer(null)}><button className="video-close" onClick={()=>setVideoViewer(null)}><X size={23}/></button><div className="video-viewer-content" onClick={e=>e.stopPropagation()}>{videoViewer.media_type?.startsWith('video/')?<video src={videoViewer.media_url} controls autoPlay playsInline/>:<img src={videoViewer.media_url} alt="رسانهٔ پست"/>}<div className="video-caption"><b>@{videoViewer.username}</b>{videoViewer.content&&<p>{videoViewer.content}</p>}<span><Heart size={17}/> {videoViewer.likes||0}</span></div></div></div>}
  {createChatOpen&&<div className="modal-backdrop" onClick={()=>setCreateChatOpen(false)}><form className="auth-modal create-chat-modal" onSubmit={createConversation} onClick={e=>e.stopPropagation()}><button type="button" className="close-modal" onClick={()=>setCreateChatOpen(false)}><X size={18}/></button><h2>گفت‌وگوی جدید</h2><p>می‌توانی با نام کاربری یک گفت‌وگوی خصوصی بسازی؛ پیام‌ها در این نسخه هنوز آنلاین نیستند.</p><div className="create-type"><button type="button" className={chatKind==='direct'?'chosen':''} onClick={()=>setChatKind('direct')}><MessageCircle size={17}/> خصوصی</button><button type="button" className={chatKind==='group'?'chosen':''} onClick={()=>setChatKind('group')}><Users size={17}/> گروه</button><button type="button" className={chatKind==='channel'?'chosen':''} onClick={()=>setChatKind('channel')}><Radio size={17}/> کانال</button></div>{chatKind==='direct'?<label>نام کاربری طرف مقابل<input value={chatUsername} onChange={e=>setChatUsername(e.target.value)} placeholder="مثلاً @mina" required/></label>:<label>نام {chatKind==='group'?'گروه':'کانال'}<input value={chatName} onChange={e=>setChatName(e.target.value)} placeholder={chatKind==='group'?'مثلاً دوستان وایرو':'مثلاً خبرهای وایرو'} required/></label>}<button className="primary-btn submit-auth">شروع {chatKind==='direct'?'گفت‌وگو':chatKind==='group'?'گروه':'کانال'}</button></form></div>}
  <nav className="mobile-nav"><button className={tab==='explore'?'mobile-active':''} onClick={()=>setTab('explore')}><Compass size={20}/><small>اکسپلور</small></button><button className={tab==='messages'?'mobile-active':''} onClick={()=>{setTab('messages');setChatId(null)}}><MessageCircle size={20}/><small>چت</small></button><button className={tab==='activity'?'mobile-active':''} onClick={()=>setTab('activity')}><Bell size={20}/><small>اعلان‌ها</small></button><button className={tab==='settings'?'mobile-active':''} onClick={()=>setTab('settings')}><Settings size={20}/><small>تنظیمات</small></button><button className={tab==='profile'?'mobile-active':''} onClick={()=>setTab('profile')}><UserRound size={20}/><small>پروفایل</small></button></nav>
 </div>;
}
