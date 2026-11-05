
(function(){
"use strict";
const H=window.GFR;
if(!H){document.getElementById("app").textContent="Kan GFR Learn Hub niet laden: common.js ontbreekt.";return}
let code=(new URLSearchParams(location.search).get("code")||localStorage.getItem("gfr_hub_last_code")||"").trim().toUpperCase();
let data=null, busy=false, polling=false, lastSignature="", phaseSeen=null, cursor={},finishedNote=false;
const $=H.qs, esc=H.esc;
function setCode(v){code=v.trim().toUpperCase();localStorage.setItem("gfr_hub_last_code",code);const url=new URL(location.href);url.searchParams.set("code",code);history.replaceState(null,"",url)}
function notice(s,error=false){H.status(s,error)}
function loginForm(error=""){
 H.frame('<div class="hero"><span class="eyebrow">WELKOM BIJ GFR LEARN HUB</span><h1 class="introTitle">Jouw kennis. Jouw missie.</h1><p class="lead">Een persoonlijke lesroute voor aardrijkskunde 3TL en 4TL. Je hebt alleen een lescode en je naam nodig.</p></div><div class="panel narrow" style="margin-top:20px"><span class="eyebrow">Leerling · online meedoen</span><h2>Doe mee aan de les</h2><form id="join"><label for="code">Lescode van je docent</label><input class="field" id="code" name="code" maxlength="10" required placeholder="Bijvoorbeeld A1B2C3D4" value="'+esc(code)+'"><label for="name">Jouw voornaam of klasnaam</label><input class="field" id="name" name="name" minlength="2" maxlength="35" required autocomplete="given-name" placeholder="Typ hier je naam"><button class="primary" type="submit">⚡ Naar mijn missie</button></form><div class="status '+(error?"error":"")+'" role="status" id="status">'+esc(error)+'</div></div>','student');
 $("#join").onsubmit=async e=>{
 e.preventDefault();if(busy)return;busy=true;const form=e.currentTarget;const btn=form.querySelector("button");
 btn.disabled=true;const wanted=form.code.value.trim().toUpperCase(),name=form.name.value.trim();
 try{notice("Je wordt aangemeld…");await H.anonymous();await H.rpc("student","gfr_join",{p_code:wanted,p_name:name});setCode(wanted);await refresh(true);startPolling();}
 catch(err){notice("Aanmelden lukt nog niet: "+err.message,true);btn.disabled=false}finally{busy=false}
 };
}
function shell(body,tag){
 const l=data.lesson, s=data.session;
 H.frame('<div class="row" style="margin-bottom:13px"><div><span class="eyebrow">'+esc(l.level)+' · '+esc(l.content.tagline||"Aardrijkskunde")+'</span><h2 style="margin-bottom:2px">'+esc(l.title)+'</h2><span class="muted small">Lescode '+esc(s.code)+' · '+esc(data.player.name)+'</span></div><span class="pill green">● Live verbonden</span></div>'+H.route(s.phase)+'<div class="status" id="status" role="status"></div>'+body,'student',l.level);
}
function waiting(){
 H.frame('<div class="hero" style="margin-top:16px"><span class="eyebrow">'+esc(data.lesson.level)+' · JOUW MISSIE</span><h1 class="introTitle">'+esc(data.lesson.content.intro?.title||data.lesson.title)+'</h1><p class="lead">'+esc(data.lesson.content.intro?.subtitle||"Je docent start de les zo.")+'</p><div class="actions"><button class="primary" id="sound">♫ Speel openingsgeluid</button><span class="pill gold">Lescode '+esc(code)+'</span></div></div><section class="panel narrow" style="margin-top:20px"><h2>Je bent aangemeld, '+esc(data.player.name)+'!</h2><p>Wacht tot je docent de Kennisscan start. Je scherm gaat vanzelf verder.</p><div class="notice">✓ Jouw laptop is verbonden. Sluit dit tabblad niet af.</div><div id="status" class="status" role="status"></div></section>','student',data.lesson.level);
 $("#sound").onclick=()=>H.makeIntroSound();
}
function answerList(phase){
 const c=data.lesson.content;
 if(phase===0)return c.scan||[];
 if(phase===1){
  const misses=new Set((c.scan||[]).filter(q=>data.answers[q.id]?.correct===false).map(q=>q.topic));
  const pool=c.boost||[];
  if(misses.size===0)return pool.slice(0,3);
  return pool.filter(q=>misses.has(q.topic));
 }
 if(phase===2)return c.challenge||[];
 if(phase===3)return c.checks||[];
 if(phase===4)return c.final||[];
 return [];
}
function openAnswerValue(value){return typeof value==="string"?value:JSON.stringify(value??"")}
function feedbackBox(q,answer,phase){
 if(phase===0)return '<div class="feedback">✓ Je antwoord is opgeslagen. Tijdens de Kennisboost ontdek je welke onderwerpen extra aandacht krijgen.</div>';
 if(!q.options)return '<div class="feedback">✓ Je open antwoord is opgeslagen. Je docent kan dit straks beoordelen.</div>';
 const good=answer.correct===true;
 return '<div class="feedback '+(good?"good":"bad")+'"><strong>'+(good?"✓ Goed gedaan!":"↗ Hier kun je van leren")+'</strong><p style="margin:9px 0 0">'+esc(q.explain||"Bekijk de uitleg nog eens en bespreek je keuze.")+'</p>'+(phase===2?'<small class="bonus">Bij goede antwoorden verdienen jullie punten. Als het hele duo goed antwoordt, komt er een teambonus bij.</small>':"")+'</div>';
}
function questionCard(q,list,phase){
 const pos=Math.min(Math.max(cursor[phase]||0,0),list.length-1),ans=data.answers[q.id],total=list.length;
 const label=phase===0?"DE SCAN":phase===1?"KENNISBOOST":phase===2?"CHALLENGE":phase===3?"KENNISCHECK":"EINDMISSIE";
 const level=phase===2?'<span class="pill gold">Level '+esc(q.level)+' · '+(q.level*100)+' punten</span>':"";
 let section='<div class="row" style="margin-bottom:18px"><span class="eyebrow">'+label+' · VRAAG '+(pos+1)+' / '+total+'</span>'+level+'</div><div class="progress"><i style="width:'+Math.round((pos+1)/total*100)+'%"></i></div><h2 style="margin:18px 0">'+esc(q.text)+'</h2>';
 if(q.options){
  section+='<div class="choices">'+q.options.map((opt,i)=>{
   const chosen=ans?.value===i;
   const cls=chosen?(ans.correct===true?" correct":ans.correct===false?" incorrect":""):"";
   return '<button class="choice'+cls+'" data-choice="'+i+'" '+(ans?"disabled":"")+'><span class="letter">'+String.fromCharCode(65+i)+'</span><span>'+esc(opt)+'</span></button>';
  }).join("")+'</div>';
 }else if(ans){
  section+='<div class="tip"><strong>Jouw antwoord</strong><p>'+esc(openAnswerValue(ans.value))+'</p></div>';
 }else{
  section+='<form id="openAnswer"><label for="openText">Schrijf jouw uitleg in eigen woorden</label><textarea id="openText" class="field" rows="5" minlength="3" maxlength="800" required placeholder="Gebruik aardrijkskundige begrippen en leg uit waarom…"></textarea><button type="submit" class="primary">Verstuur mijn antwoord</button></form>';
 }
 if(ans){
  section+=feedbackBox(q,ans,phase);
  section+='<div class="actions"><button id="nextQuestion" class="primary">'+(pos+1===total?"Ronde afgerond ✓":"Volgende vraag →")+'</button></div>';
 }
 return '<div class="question">'+section+'</div>';
}
function drawIntro(stage){
 const c=data.lesson.content;
 if(stage===0)return '<div class="panel light"><span class="eyebrow">RONDE 01 · STARTMETING</span><h2>Wat weet jij al?</h2><p>Beantwoord de vragen zelfstandig. Je krijgt hier <b>geen cijfer</b> voor. De antwoorden bepalen welke Kennisboost voor jou het nuttigst is.</p></div>';
 if(stage===1){
 const list=answerList(1);const all=(c.scan||[]).length;
 const good=(c.scan||[]).filter(q=>data.answers[q.id]?.correct===true).length;
 const focus=[...new Set(list.map(q=>c.topics[q.topic]?.name||q.topic))];
 return '<div class="panel light"><span class="eyebrow">RONDE 02 · OP MAAT</span><h2>Dit is jouw persoonlijke Kennisboost</h2><p>In de Scan had je <b>'+good+' van de '+all+'</b> vragen goed. '+(good===all?"Sterk! Je krijgt nu extra verdiepingsvragen.":"We gaan oefenen met onderwerpen die nog lastig waren.")+'</p><p><strong>Jouw leerroute:</strong> '+esc(focus.join(" · "))+'</p></div>';
 }
 if(stage===2){
 const mode=data.session.mode,team=data.team;
 let info='<div class="panel light"><span class="eyebrow">RONDE 03 · GAME ON</span><h2>'+(mode==="duo"?"Duo Challenge":"Solo Challenge")+'</h2><p>Drie levels. Level 1: 100 punten, level 2: 200 punten, level 3: 300 punten per goed antwoord.'+(mode==="duo"?" Elk teamlid antwoordt op de eigen laptop. Antwoorden jullie allebei goed, dan krijgt het team 50 bonuspunten.":" Laat zien wat jij kunt!")+'</p></div>';
 if(mode==="duo"&&team){
 info+='<div class="panel" style="margin-top:14px"><div class="row"><div><span class="eyebrow">JOUW TEAM</span><h2>'+esc(team.name)+'</h2><p>'+esc(team.members.join(" + "))+'</p></div><div style="text-align:right"><span class="eyebrow">JULLIE SCORE</span><div class="xl" id="teamScore">'+esc(team.progress.score)+' p</div><small class="bonus" id="teamBonus">Inclusief '+esc(team.progress.bonus)+' bonuspunten</small></div></div></div>';
 }else if(mode==="solo"){
 const sum=Object.entries(data.answers).filter(([id,v])=>id.startsWith("c")).reduce((a,[id,v])=>a+(v.points||0),0);
 info+='<div class="panel" style="margin-top:14px"><div class="eyebrow">JOUW SCORE</div><div class="xl" id="teamScore">'+sum+' punten</div></div>';
 }
 return info;
 }
 if(stage===3){
 const d=c.newContent||{title:"Nieuwe inhoud",lead:"Ontdek het volgende onderwerp",blocks:[]};
 return '<div class="panel light"><span class="eyebrow">RONDE 04 · NIEUWE KENNIS</span><h2>'+esc(d.title)+'</h2><p>'+esc(d.lead)+'</p></div><div class="grid" style="margin:18px 0">'+(d.blocks||[]).map((b,i)=>'<div class="col4 panel"><div class="eyebrow">ONTDEK '+(i+1)+'</div><h3>'+esc(b.title)+'</h3><p>'+esc(b.text)+'</p></div>').join("")+'</div>';
 }
 if(stage===4)return '<div class="panel light"><span class="eyebrow">RONDE 05 · INDIVIDUEEL</span><h2>De Eindmissie</h2><p>Laat zien hoe je de oude en de nieuwe kennis kunt gebruiken. Je werkt weer zelfstandig. Sommige antwoorden kijkt je docent na.</p></div>';
 return "";
}
function lessonScreen(){
 const phase=data.session.phase,c=data.lesson.content;
 if(data.session.status==="waiting")return waiting();
 if(phase===2&&data.session.mode==="duo"&&!data.team){
  shell('<div class="panel light"><span class="eyebrow">CHALLENGE</span><h2>Je team wordt samengesteld</h2><p>Je docent maakt de duo-indeling. Je krijgt je team automatisch op dit scherm.</p></div>'+H.waitTask(c,2));return;
 }
 if(phase===5)return reflectionScreen();
 const list=answerList(phase);
 if(phaseSeen!==phase){phaseSeen=phase;cursor[phase]=Math.max(0,list.findIndex(q=>!data.answers[q.id]));}
 let ix=Math.min(Math.max(cursor[phase]||0,0),Math.max(list.length-1,0)),q=list[ix];
 if(!q||list.every(q=>data.answers[q.id])&&ix>=list.length){
  shell(drawIntro(phase)+'<div class="panel" style="margin-top:18px"><span class="eyebrow">RONDE AFGEROND</span><h2>Goed gewerkt! ✅</h2><p>Je hebt alle opdrachten voor deze fase gemaakt. Wacht tot je docent de volgende ronde start.</p></div>'+H.waitTask(c,phase));return;
 }
 let before=drawIntro(phase);
 if(phase===1){
  const t=c.topics[q.topic];
  if(t)before+='<div class="panel" style="margin:17px 0"><span class="eyebrow">MINI-LES · '+esc(t.name)+'</span><h2>'+esc(t.icon)+' '+esc(t.name)+'</h2><p>'+esc(t.intro)+'</p><ol>'+t.steps.map(st=>'<li style="margin-bottom:6px">'+esc(st)+'</li>').join("")+'</ol><div class="note">'+esc(t.tip)+'</div></div>';
 }
 if(phase===2)before+='<div class="levelstrip">'+[1,2,3].map(i=>'<span class="'+(q.level===i?'active':'')+'">LEVEL '+i+' · '+(i*100)+' PT</span>').join("")+'</div>';
 const answered=!!data.answers[q.id];
 const nav='<div class="actions" style="margin:18px 0"><span class="muted">Je bent bij '+(ix+1)+' van '+list.length+' opdrachten.</span>'+(ix>0?'<button class="small ghost" id="prevQuestion">← Vorige</button>':"")+'</div>';
 shell(before+'<div class="panel" style="margin-top:18px">'+nav+questionCard(q,list,phase)+'</div>'+(answered&&ix===list.length-1?H.waitTask(c,phase):""),'LIVE');
 H.qsa("[data-choice]").forEach(el=>el.onclick=()=>submit(q,+el.dataset.choice));
 const open=$("#openAnswer");if(open)open.onsubmit=e=>{e.preventDefault();submit(q,$("#openText").value)};
 const prev=$("#prevQuestion");if(prev)prev.onclick=()=>{cursor[phase]=Math.max(0,ix-1);lessonScreen()};
 const next=$("#nextQuestion");if(next)next.onclick=()=>{cursor[phase]=ix+1;lessonScreen()};
}
async function submit(q,value){
 if(busy)return;busy=true;
 H.qsa("[data-choice], #openAnswer button").forEach(b=>b.disabled=true);
 notice("Antwoord wordt veilig opgeslagen…");
 try{
  const res=await H.rpc("student","gfr_submit",{p_code:code,p_question:q.id,p_answer:value});
  await refresh(true);notice(res.alreadySaved?"Dit antwoord was al opgeslagen.":"✓ Antwoord opgeslagen.");
 }catch(err){notice("Opslaan mislukt: "+err.message,true);H.qsa("[data-choice], #openAnswer button").forEach(b=>b.disabled=false)}
 finally{busy=false}
}
function reflectionScreen(){
 const r=data.lesson.content.reflection||{},reflected=data.reflected,rank=data.ranking||[];
 let board='<div class="panel" style="margin-top:18px"><span class="eyebrow">CHALLENGE-UITSLAG</span><h2>'+(data.session.revealed?"De winnaars! 🏆":"De uitslag blijft nog geheim")+'</h2>';
 if(data.session.revealed&&rank.length){
  board+='<div class="stack">'+rank.map((s,i)=>'<div class="scoreline '+(i===0?"winner":"")+'"><strong>'+(i+1)+'. '+esc(s.name)+(i===0?" 🏆":"")+'</strong><b>'+esc(s.score)+' punten</b></div>').join("")+'</div>';
 }else board+='<p>Je docent onthult de teamscores wanneer iedereen klaar is.</p>';
 board+='</div>';
 const choices=(r.nextStyles||["Startquiz","Onderzoek","Klassengesprek"]).map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("");
 const form=reflected?'<div class="notice">✓ Bedankt! Je terugblik is opgeslagen. Je mag rustig wachten op de uitslag.</div>':
 '<form id="reflectForm"><label for="rating">Hoe vond je deze les?</label><select id="rating" class="field"><option value="5">★★★★★ · heel goed</option><option value="4" selected>★★★★ · goed</option><option value="3">★★★ · prima</option><option value="2">★★ · minder</option><option value="1">★ · lastig</option></select><label for="helped">Welke uitleg of oefening hielp je het meest?</label><input id="helped" class="field" maxlength="250" placeholder="Bijvoorbeeld de uitleg over waterkracht"><label for="hardest">Wat wil je nog beter begrijpen?</label><input id="hardest" class="field" maxlength="250" placeholder="Bijvoorbeeld de energiemix"><label for="nextStyle">Hoe wil je de volgende les starten?</label><select id="nextStyle" class="field">'+choices+'</select><button type="submit" class="primary">Verstuur mijn terugblik</button></form>';
 shell('<div class="panel light"><span class="eyebrow">RONDE 06 · AFSLUITEN</span><h2>Terugblik &amp; Vooruitblik</h2><p>'+esc(r.question||"Wat neem je mee uit deze les?")+'</p></div><div class="panel" style="margin-top:18px">'+form+'</div>'+board);
 const f=$("#reflectForm");if(f)f.onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;try{await H.rpc("student","gfr_reflect",{p_code:code,p_rating:+$("#rating").value,p_helped:$("#helped").value,p_hardest:$("#hardest").value,p_next_style:$("#nextStyle").value});await refresh(true)}catch(err){notice(err.message,true)}finally{busy=false}};
}
function render(){
 if(!data)return loginForm();
 if(data.session.status==="finished"&&data.session.phase!==5){shell('<div class="panel"><h2>De les is afgerond ✅</h2><p>Bedankt voor het meedoen!</p></div>');return}
 lessonScreen();
}
async function refresh(force=false){
 if(!code||polling||busy&&!force)return;
 polling=true;
 try{
  const fresh=await H.rpc("student","gfr_student_state",{p_code:code});
  const phaseChanged=!data||fresh.session.phase!==data.session.phase||
    fresh.session.status!==data.session.status||fresh.session.published!==data.session.published||
    fresh.session.mode!==data.session.mode||fresh.session.revealed!==data.session.revealed||
    (!!fresh.team)!=(!!data.team);
  data=fresh;
  if(force||phaseChanged)render();
  else{
   const score=$("#teamScore");if(score){
    if(data.session.mode==="duo"&&data.team){score.textContent=data.team.progress.score+" p";const b=$("#teamBonus");if(b)b.textContent="Inclusief "+data.team.progress.bonus+" bonuspunten";}
    if(data.session.mode==="solo")score.textContent=Object.entries(data.answers).filter(([id])=>id.startsWith("c")).reduce((x,[,v])=>x+(v.points||0),0)+" punten";
   }
  }
 }catch(err){
  if(force)notice("Verbinding: "+err.message,true);else console.warn("GFR sync:",err.message);
 }finally{polling=false}
}
function startPolling(){if(window.gfrPoll)return;window.gfrPoll=setInterval(()=>{if(document.visibilityState==="visible")refresh(false)},4500);window.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh(false)})}
async function init(){
 try{
  if(code&&(await H.token("student"))){
   const fresh=await H.rpc("student","gfr_student_state",{p_code:code});
   data=fresh;render();startPolling();return;
  }
  loginForm();
 }catch(err){loginForm("Je kunt opnieuw deelnemen met je lescode. "+err.message)}
}
window.addEventListener("error",e=>{console.error("GFR leerling:",e.message);notice("Er ging iets mis in deze pagina: "+e.message,true)});
init();
})();
