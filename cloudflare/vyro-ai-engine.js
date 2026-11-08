export default {
 async fetch(request, env) {
  const origin=request.headers.get("Origin")||"";
  const allowed=["https://vyro-web-b9p.pages.dev","capacitor://localhost","http://localhost","https://localhost"];
  const corsOrigin=allowed.includes(origin)?origin:"https://vyro-web-b9p.pages.dev";
  const cors={"Access-Control-Allow-Origin":corsOrigin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Authorization, Content-Type, apikey","Vary":"Origin"};
  if(request.method==="OPTIONS")return new Response(null,{headers:cors});
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
  if(request.method!=="POST")return json({error:"Method not allowed"},405);
  try{
   const auth=request.headers.get("Authorization")||"";
   const apiKey=request.headers.get("apikey")||"";
   if(!auth.startsWith("Bearer ")||!apiKey)return json({error:"ورود به حساب وایرو لازم است."},401);
   const verify=await fetch("https://drwnfifwvyfplsiqnvlp.supabase.co/auth/v1/user",{headers:{"apikey":apiKey,"Authorization":auth}});
   if(!verify.ok)return json({error:"نشست ورود معتبر نیست؛ دوباره وارد شو."},401);
   const body=await request.json();
   if(typeof body?.imagePrompt==="string"&&body.imagePrompt.trim()){
    const result=await env.AI.run("@cf/black-forest-labs/flux-1-schnell",{prompt:body.imagePrompt.trim().slice(0,1600)});
    const bytes=result instanceof ArrayBuffer?new Uint8Array(result):result instanceof Uint8Array?result:result?.image?Uint8Array.from(atob(result.image),c=>c.charCodeAt(0)):null;
    if(!bytes)return json({error:"مدل تصویر خروجی قابل نمایش نداد."},502);
    let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return json({imageUrl:"data:image/png;base64,"+btoa(binary)});
   }
   const messages=Array.isArray(body?.messages)?body.messages.filter(m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").slice(-18).map(m=>({role:m.role,content:m.content.slice(0,5000)})):[];
   if(!messages.length||messages[messages.length-1].role!=="user")return json({error:"پیام کاربر ارسال نشده است."},400);
   const result=await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast",{messages:[{role:"system",content:"You are Vyro's independent assistant. Reply in the language used by the user, Persian by default. Be helpful, accurate, warm, and concise. Never claim to have performed actions you did not perform. If uncertain, say so."},...messages],max_tokens:1100,temperature:0.65});
   const answer=result?.response||result?.choices?.[0]?.message?.content||result?.result?.response;
   if(typeof answer!=="string"||!answer.trim())return json({error:"مدل پاسخ متنی برنگرداند."},502);
   return json({answer,provider:"Cloudflare Workers AI",model:"Llama 3.3"});
  }catch(error){return json({error:"موتور مستقل وایرو موقتاً پاسخ نداد.",detail:String(error?.message||error).slice(0,220)},502)}
 }
};