
(function(){
"use strict";
const URL="https://lcixyqpuzvpfyrxyctxc.supabase.co";
const KEY="sb_publishable_idWdSnjZWZbV2etfvlXbhw_eJPaJ5mx";
const VERSION="v11.1";
const stages=[
{name:"De Scan",short:"Voorkennis",icon:"🔎"},
{name:"Kennisboost",short:"Op maat",icon:"🧠"},
{name:"Duo/Solo Challenge",short:"Spel",icon:"🎮"},
{name:"Nieuwe inhoud",short:"Ontdekken",icon:"🌍"},
{name:"Eindmissie",short:"Toepassen",icon:"🎯"},
{name:"Terug- & Vooruitblik",short:"Reflectie",icon:"✨"}
];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const attr=esc;
function authKey(role){return role==="teacher"?"gfr_hub_teacher_auth":"gfr_hub_student_auth";}
function readSession(role){try{return JSON.parse(localStorage.getItem(authKey(role))||"null")}catch{return null}}
function saveSession(role,s){let existing=readSession(role);let v={
 access_token:s.access_token||existing?.access_token,
 refresh_token:s.refresh_token||existing?.refresh_token,
 expires_at:s.expires_at||(Math.floor(Date.now()/1000)+(s.expires_in||3600)),
 user:s.user||existing?.user||null
};localStorage.setItem(authKey(role),JSON.stringify(v));return v}
function clear(role){localStorage.removeItem(authKey(role))}
async function raw(path,options={}){
 const headers={"apikey":KEY,"Content-Type":"application/json","Accept":"application/json"};
 if(options.token)headers.Authorization="Bearer "+options.token;
 let res;
 try{res=await fetch(URL+path,{method:options.method||"POST",headers,body:options.body===undefined?undefined:JSON.stringify(options.body),signal:options.signal})}
 catch(err){throw new Error("Geen verbinding met de lesdatabase. Controleer internet en probeer opnieuw. ("+err.message+")")}
 let result;const content=await res.text();
 try{result=content?JSON.parse(content):null}catch{result=content}
 if(!res.ok){const desc=result?.msg||result?.error_description||result?.message||result?.error||res.statusText||"Onbekende fout";throw new Error(typeof desc==="string"?desc:JSON.stringify(desc))}
 return result;
}
async function token(role){
 let s=readSession(role);if(!s?.access_token)return null;
 if((s.expires_at||0)>Math.floor(Date.now()/1000)+70)return s.access_token;
 if(!s.refresh_token){clear(role);return null}
 try{const v=await raw("/auth/v1/token?grant_type=refresh_token",{body:{refresh_token:s.refresh_token}});return saveSession(role,v).access_token}
 catch(err){clear(role);throw new Error("Je sessie is verlopen. Meld je opnieuw aan. "+err.message)}
}
async function anonymous(){
 const old=await token("student");if(old)return readSession("student");
 const s=await raw("/auth/v1/signup",{body:{data:{}}});
 if(!s?.access_token)throw new Error("Anoniem aanmelden is niet toegestaan. Controleer de Supabase-instelling voor anonieme gebruikers.");
 return saveSession("student",s);
}
async function teacherLogin(email,password){
 const s=await raw("/auth/v1/token?grant_type=password",{body:{email,password}});
 if(!s?.access_token)throw new Error("Inloggen is mislukt");return saveSession("teacher",s);
}
async function rpc(role,fn,params={}){
 const access=await token(role);
 if(!access)throw new Error("Je bent niet aangemeld. Open de pagina opnieuw.");
 return raw("/rest/v1/rpc/"+encodeURIComponent(fn),{body:params,token:access});
}
function frame(inner,role="student",tag=""){
 const label=role==="teacher"?"DOCENTPORTAAL":"LEERLINGOMGEVING";
 document.getElementById("app").innerHTML='<div class="container"><header class="topbar"><a class="brand" href="index.html"><span class="logo">GFR</span><span class="brandtext"><b>GFR Learn Hub</b><small>MARIS COLLEGE BOHEMEN · '+label+'</small></span></a><div class="pills"><span class="pill">AARDRIJKSKUNDE · 3TL / 4TL</span>'+(tag?'<span class="pill green">'+esc(tag)+'</span>':"")+'</div></header><main style="padding-top:24px">'+inner+'</main><footer class="footer">GFR Learn Hub · '+esc(VERSION)+' · V10-vormgeving · Live via Supabase</footer></div>';
}
function status(message,error=false){
 const node=document.getElementById("status");if(node){node.textContent=message;node.classList.toggle("error",!!error)}else if(error)console.error(message);
}
function route(active,done=true){
 return '<div class="route" aria-label="Lesroute">'+stages.map((s,i)=>'<div class="routeitem '+(i===active?'active':done&&i<active?'done':'')+'" aria-current="'+(i===active?'step':'false')+'"><span class="n">0'+(i+1)+' · '+esc(s.icon)+'</span><b>'+esc(s.name)+'</b></div>').join("")+'</div>';
}
function waitTask(content,index){
 const task=content?.waits?.[index]||"Bedenk een vraag voor een klasgenoot over het onderwerp van de les.";
 return '<div class="task"><div class="eyebrow">⚡ Klaar voordat de klas zover is?</div><h3>Mini-uitdaging terwijl je wacht</h3><p>'+esc(task)+'</p><small>Dit is een extra denkactiviteit, geen toets en zonder punten.</small></div>';
}
function loading(title="Je les wordt geladen…"){
 frame('<div class="panel narrow" style="margin-top:26px"><span class="eyebrow">GFR LIVE</span><h2>'+esc(title)+'</h2><p class="muted">Je verbinding wordt gecontroleerd.</p><div id="status" role="status"></div></div>');
}
function makeIntroSound(){
 let Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
 try{
 const ctx=new Ctx(),now=ctx.currentTime;[164.8,220,329.6,440,659.3,880].forEach((pitch,i)=>{
 const osc=ctx.createOscillator(),gain=ctx.createGain(),t=now+i*.13;
 osc.type=i<2?"triangle":"sine";osc.frequency.setValueAtTime(pitch,t);gain.gain.setValueAtTime(.0001,t);
 gain.gain.exponentialRampToValueAtTime(.08,t+.04);gain.gain.exponentialRampToValueAtTime(.0001,t+.45);
 osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.46);
 });setTimeout(()=>ctx.close().catch(()=>{}),1700);
 }catch(e){console.warn("Geluid is niet beschikbaar",e)}
}
function isTyping(){const e=document.activeElement;return !!e&&["INPUT","TEXTAREA","SELECT"].includes(e.tagName)}
function qs(s){return document.querySelector(s)}
function qsa(s){return [...document.querySelectorAll(s)]}
window.GFR={URL,KEY,VERSION,stages,esc,attr,readSession,saveSession,clear,token,anonymous,teacherLogin,rpc,frame,status,route,waitTask,loading,makeIntroSound,isTyping,qs,qsa};
})();
