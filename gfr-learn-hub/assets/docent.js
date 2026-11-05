
(function(){
"use strict";
const H=window.GFR;if(!H){document.getElementById("app").textContent="GFR Learn Hub kon niet starten. Controleer common.js.";return}
const esc=H.esc,$=H.qs;
let code=(new URLSearchParams(location.search).get("code")||"").trim().toUpperCase();
let data=null,catalog=[],sessions=[],busy=false,polling=false,draftTeams=null,viewVersion="",logged=false,filter="alle";
const label=(code)=>code?esc(code):"Geen code";
const link=code=>new URL("leerling.html?code="+encodeURIComponent(code),location.href).href;
function setCode(v){code=(v||"").trim().toUpperCase();let u=new URL(location.href);if(code)u.searchParams.set("code",code);else u.searchParams.delete("code");history.replaceState(null,"",u);draftTeams=null;viewVersion="";}
function msg(v,err=false){H.status(v,err)}
function login(error=""){
 H.frame('<div class="hero" style="margin-top:18px"><span class="eyebrow">MARIS COLLEGE · DOCENTENOMGEVING</span><h1>Jouw lessen.<br>Één live platform.</h1><p class="lead">Maak lessen voor aardrijkskunde 3TL en 4TL. Start de Scan, begeleid persoonlijke leerpaden en laat de klas de Challenge spelen.</p></div><section class="panel narrow" style="margin-top:20px"><span class="eyebrow">Beveiligd docentportaal</span><h2>Inloggen</h2><form id="teacherForm"><label for="email">Docent-e-mailadres</label><input id="email" class="field" type="email" autocomplete="username" value="bom@mariscollege.nl" required><label for="pass">Wachtwoord</label><input id="pass" class="field" type="password" autocomplete="current-password" required><button class="primary" type="submit">Log in als docent</button></form><div class="status '+(error?"error":"")+'" id="status" role="status">'+esc(error)+'</div></section>','teacher');
 $("#teacherForm").onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;$("#teacherForm button").disabled=true;msg("Beveiligd inloggen…");
 try{await H.teacherLogin($("#email").value.trim(),$("#pass").value);logged=true;await listAll(true)}
 catch(err){msg("Inloggen mislukt: "+err.message,true);$("#teacherForm button").disabled=false}finally{busy=false}};
}
function levelPill(level){return '<span class="pill gold">'+esc(level)+'</span>'}
function landing(){
 const available=catalog.filter(c=>filter==="alle"||c.level===filter);
 let cards=available.map(c=>'<article class="col6 course"><div class="row"><span class="level">AARDRIJKSKUNDE '+esc(c.level)+'</span>'+levelPill(c.level)+'</div><h3 style="margin:14px 0 6px">'+esc(c.title)+'</h3><p class="muted">'+esc(c.summary)+'</p><button class="primary" data-create="'+esc(c.slug)+'">Nieuwe live les starten</button></article>').join("");
 H.frame('<section class="hero" style="min-height:220px"><span class="eyebrow">GFR Learn Hub · Docentportaal</span><h1>Jouw lessenbibliotheek</h1><p class="lead">Eén vaste lesstructuur voor aardrijkskunde 3TL en 4TL. Leerlingen werken online, jij houdt de regie.</p></section><section class="panel" style="margin-top:22px"><div class="row"><div><span class="eyebrow">LESBIBLIOTHEEK</span><h2>Start een nieuwe lessessie</h2></div><div class="actions"><button class="small '+(filter==="alle"?"primary":"ghost")+'" data-filter="alle">Alle</button><button class="small '+(filter==="3TL"?"primary":"ghost")+'" data-filter="3TL">3TL</button><button class="small '+(filter==="4TL"?"primary":"ghost")+'" data-filter="4TL">4TL</button></div></div><div class="grid">'+cards+'</div><p class="muted small" style="margin-top:15px">De 4TL-waterles is een proefles. Definitieve inhoud volgt uit jouw lesmateriaal.</p></section><section class="panel" style="margin-top:20px"><div class="row"><div><span class="eyebrow">LAATSTE LESSEN</span><h2>Open een bestaande sessie</h2></div><button class="small ghost" id="reload">Vernieuwen</button></div><div class="tablewrap"><table><thead><tr><th>Les</th><th>Leerjaar</th><th>Code</th><th>Leerlingen</th><th>Status</th><th></th></tr></thead><tbody>'+(sessions.length?sessions.map(s=>'<tr><td>'+esc(s.title)+'</td><td>'+esc(s.level)+'</td><td><strong>'+esc(s.code)+'</strong></td><td>'+esc(s.count)+'</td><td>'+esc(s.status)+'</td><td><button class="small" data-open="'+esc(s.code)+'">Open</button></td></tr>').join(""):'<tr><td colspan="6">Er zijn nog geen sessies. Start hierboven je eerste les.</td></tr>')+'</tbody></table></div><div class="status" id="status" role="status"></div></section><div class="actions" style="margin-top:16px"><button class="ghost small" id="logout">Log uit</button></div>','teacher');
 H.qsa("[data-filter]").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;landing()});
 H.qsa("[data-create]").forEach(b=>b.onclick=()=>create(b.dataset.create,b));
 H.qsa("[data-open]").forEach(b=>b.onclick=()=>{setCode(b.dataset.open);refresh(true);startPolling()});
 $("#reload").onclick=()=>listAll(true);
 $("#logout").onclick=()=>{H.clear("teacher");logged=false;code="";login("Je bent uitgelogd.")};
}
async function listAll(render=true){
 try{[catalog,sessions]=await Promise.all([H.rpc("teacher","gfr_catalog"),H.rpc("teacher","gfr_teacher_sessions")]);logged=true;if(render)landing()}
 catch(err){if(render)login("Je account is niet verbonden als GFR-docent: "+err.message)}
}
async function create(slug,btn){
 if(busy)return;busy=true;btn.disabled=true;msg("Nieuwe les wordt gestart…");
 try{const r=await H.rpc("teacher","gfr_teacher_create",{p_slug:slug});setCode(r.code);await refresh(true);startPolling()}
 catch(err){msg("Nieuwe les starten mislukt: "+err.message,true);btn.disabled=false}finally{busy=false}
}
function progress(s,phase){return Number(s.counts?.[String(phase)]||0)}
function sumAnswered(phase){return data.students.reduce((n,s)=>n+progress(s,phase),0)}
function stageCards(){
 return H.route(data.session.phase);
}
function report(){
 const d=data,c=d.session.lesson.content;
 const scanN=(c.scan||[]).length,chN=(c.challenge||[]).length,students=d.students||[];
 return '<div class="grid" style="margin:0 0 20px"><div class="col3 metric"><small>Leerlingen verbonden</small><div class="value">'+students.length+'</div></div><div class="col3 metric"><small>Scan afgerond</small><div class="value">'+students.filter(s=>progress(s,0)>=scanN).length+'/'+students.length+'</div></div><div class="col3 metric"><small>Challenge-antwoorden</small><div class="value">'+sumAnswered(2)+'</div></div><div class="col3 metric"><small>Terugblikken</small><div class="value">'+d.reflectionCount+'</div></div></div>';
}
function controls(){
 const s=data.session,phase=s.phase;
 const active=s.status==="active";
 return '<div class="panel"><div class="row"><div><span class="eyebrow">JOUW REGIE · LESCODE '+esc(s.code)+'</span><h2 style="margin:6px 0">'+esc(H.stages[phase].icon)+' '+esc(H.stages[phase].name)+'</h2><p class="muted" style="margin:0">Status: '+(s.status==="waiting"?"Klaar om te starten":s.status==="active"?"Les is live":"Les afgerond")+'</p></div><div class="actions">'+(!active&&s.status==="waiting"?'<button class="primary" data-action="start">▶ Start de les</button>':"")+(active?'<button class="ghost" data-phase="'+Math.max(phase-1,0)+'" '+(phase===0?"disabled":"")+'>← Vorige</button><button class="primary" data-phase="'+Math.min(phase+1,5)+'" '+(phase===5?"disabled":"")+'>Volgende fase →</button>':'')+'</div></div><div class="divider"></div><div class="row"><div><b>Challenge-modus</b><p class="muted small">Kies vóór de Challenge of leerlingen solo of in een duo spelen.</p></div><div class="actions"><button class="small '+(s.mode==="solo"?"primary":"ghost")+'" data-mode="solo" '+(phase>2?"disabled":"")+'>Solo Challenge</button><button class="small '+(s.mode==="duo"?"primary":"ghost")+'" data-mode="duo" '+(phase>2?"disabled":"")+'>Duo Challenge</button></div></div></div>';
}
function share(){
 const u=link(data.session.code);
 return '<div class="panel"><div class="row"><div><span class="eyebrow">LEERLINGEN LATEN DEELNEMEN</span><h2>Lescode: <span style="color:#96f5ef;letter-spacing:.13em">'+esc(data.session.code)+'</span></h2><p class="muted small">Leerlingen openen één link via SOMtoday, vullen deze code en hun naam in. Geen download.</p><a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(u)+'</a></div><div class="actions"><button class="primary" id="copyLink">Kopieer leerlinglink</button><button class="ghost" id="showIntro">⚡ Open lesintro</button></div></div></div>';
}
function makeTeams(){
 const students=[...data.students];
 const scan=data.session.lesson.content.scan||[];
 const topicName=Object.keys(data.session.lesson.content.topics||{});
 const strengths=id=>{
  const res={};for(const topic of topicName){const qids=scan.filter(q=>q.topic===topic).map(q=>q.id);
  const correct=qids.filter(qid=>data.answers.some(a=>a.playerId===id&&a.questionId===qid&&a.correct===true)).length;
  res[topic]=qids.length?correct/qids.length:0}
  return res;
 };
 let remaining=students.sort((a,b)=>b.scanCorrect-a.scanCorrect);
 const teams=[];
 while(remaining.length>=4){
  const a=remaining.shift(),skillA=strengths(a.id);
  let bestIdx=0,best=-Infinity;
  remaining.forEach((b,i)=>{const skillB=strengths(b.id);
   const comp=topicName.reduce((acc,t)=>acc+Math.abs(skillA[t]-skillB[t]),0);
   const balance=Math.abs(a.scanCorrect-b.scanCorrect)/Math.max(1,scan.length);
   const value=comp*2+balance;
   if(value>best){best=value;bestIdx=i}
  });
  const b=remaining.splice(bestIdx,1)[0];
  teams.push({name:"Team "+(teams.length+1),members:[a.id,b.id]});
 }
 if(remaining.length===3)teams.push({name:"Trio "+(teams.length+1),members:remaining.map(s=>s.id)});
 else if(remaining.length===2)teams.push({name:"Team "+(teams.length+1),members:remaining.map(s=>s.id)});
 else if(remaining.length===1&&teams.length)teams[teams.length-1].members.push(remaining[0].id);
 else if(remaining.length===1)teams.push({name:"Team "+(teams.length+1),members:[remaining[0].id]});
 draftTeams=teams;
}
function nameFor(id){return data.students.find(s=>s.id===id)?.name||"Onbekend"}
function teamPanel(){
 if(data.session.mode!=="duo")return '<div class="panel"><span class="eyebrow">SOLO CHALLENGE</span><h3>Iedere leerling speelt individueel</h3><p>Je kunt op elk moment vóór de Challenge terugschakelen naar duo.</p></div>';
 const saved=data.teams||[];
 let t=draftTeams||saved.map(o=>({name:o.name,members:[...o.members]}));
 let body='<div class="panel"><div class="row"><div><span class="eyebrow">DUO CHALLENGE</span><h2>Teams maken en beheren</h2><p class="muted small">Automatisch samengesteld op basis van aanvullende sterke punten. Je kunt leerlingen nog wisselen vóór publicatie.</p></div><div class="actions"><button class="ghost" id="autoTeams">Maak slimme teams</button></div></div>';
 if(t?.length){
 body+='<div class="teamlist">'+t.map((tm,i)=>'<div class="teamcard"><strong>'+esc(tm.name)+'</strong>'+tm.members.map((id,j)=>'<label class="muted small" style="margin-top:8px">Plek '+(j+1)+'<select class="field" data-swap="'+i+':'+j+'">'+data.students.map(s=>'<option value="'+esc(s.id)+'" '+(s.id===id?"selected":"")+'>'+esc(s.name)+'</option>').join("")+'</select></label>').join("")+'</div>').join("")+'</div>';
 body+='<div class="actions" style="margin-top:17px"><button class="primary" id="saveTeams">Sla deze indeling op</button>'+(!draftTeams&&!data.session.published?'<button class="primary" id="publishTeams">Onthul duo-indeling aan leerlingen</button>':"")+'</div>';
 if(data.session.published)body+='<div class="notice" style="margin-top:12px">✓ Teamindeling is gepubliceerd op de leerlinglaptops.</div>';
 else body+='<p class="small muted" style="margin-top:10px">Pas na publicatie zien leerlingen hun team. Daarna kan de Challenge starten.</p>';
 }else body+='<div class="note">Maak de teams wanneer minstens twee leerlingen zijn aangemeld.</div>';
 body+='</div>';
 return body;
}
function studentsPanel(){
 const c=data.session.lesson.content;const total=(c.scan||[]).length;
 const body=data.students.length?data.students.map(s=>{
  const k=progress(s,data.session.phase),need=(data.session.phase===0?total:data.session.phase===1?(c.boost||[]).length:data.session.phase===2?(c.challenge||[]).length:data.session.phase===3?(c.checks||[]).length:data.session.phase===4?(c.final||[]).length:0);
  return '<tr><td><strong>'+esc(s.name)+'</strong></td><td>'+s.scanCorrect+'/'+total+'</td><td>'+k+(need?"/"+need:"")+'</td><td>'+esc(s.points)+'</td></tr>';
 }).join(""):'<tr><td colspan="4">Er zijn nog geen leerlingen aangesloten. Deel de link hierboven.</td></tr>';
 return '<div class="panel"><div class="row"><div><span class="eyebrow">LIVE KLASOVERZICHT</span><h2>Leerlingen en voortgang</h2></div><span class="pill green">Automatische update · 5 sec.</span></div><div class="tablewrap"><table><thead><tr><th>Leerling</th><th>Scan</th><th>Huidige fase</th><th>Individuele punten</th></tr></thead><tbody>'+body+'</tbody></table></div></div>';
}
function scorePanel(){
 const s=data.session;
 if(s.mode==="solo"){
  const ranking=[...data.students].sort((a,b)=>b.points-a.points);
  return '<div class="panel"><span class="eyebrow">SOLO SCOREBORD · ALLEEN DOCENT</span><h2>Individuele score</h2>'+ranking.map((p,i)=>'<div class="scoreline"><strong>'+(i+1)+'. '+esc(p.name)+'</strong><b>'+esc(p.points)+' punten</b></div>').join("")+'</div>';
 }
 return '<div class="panel"><div class="row"><div><div class="eyebrow">TEAM SCOREBORD · ALLEEN DOCENT</div><h2>Challenge-standen</h2></div>'+(s.phase===5&&!s.revealed?'<button class="primary" id="reveal">🏆 Onthul winnaar aan de klas</button>':s.revealed?'<span class="pill gold">🏆 Winnaar onthuld</span>':'<span class="pill">Uitslag pas in de terugblik</span>')+'</div>'+(data.teams?.length?[...data.teams].sort((a,b)=>b.score.score-a.score.score).map((t,i)=>'<div class="scoreline '+(s.revealed&&i===0?"winner":"")+'"><div><strong>'+(i+1)+'. '+esc(t.name)+'</strong><div class="small muted">'+t.members.map(nameFor).map(esc).join(" + ")+' · '+esc(t.score.complete)+' volledig goed</div></div><div style="text-align:right"><b>'+esc(t.score.score)+' punten</b><div class="small bonus">+'+esc(t.score.bonus)+' teambonus</div></div></div>').join(""):'<p class="muted">Nog geen teams samengesteld.</p>')+'</div>';
}
function grading(){
 const qmap=Object.fromEntries((data.session.lesson.content.final||[]).map(q=>[q.id,q]));
 const open=(data.answers||[]).filter(a=>a.phase===4&&!qmap[a.questionId]?.options);
 return '<div class="panel"><span class="eyebrow">EINDMISSIE · OPEN ANTWOORDEN</span><h2>Beoordeel individuele uitleg</h2>'+(open.length?open.map(a=>'<div class="cardline"><div class="row"><b>'+esc(a.name)+'</b><span class="pill">'+esc(a.questionId)+'</span></div><p class="muted small">'+esc(qmap[a.questionId]?.text||"Open vraag")+'</p><p>'+esc(a.answer)+'</p><div class="actions"><span class="small muted">Huidig: '+a.points+' punten</span>'+[0,100,200,300].map(p=>'<button class="small '+(a.points===p?"primary":"ghost")+'" data-grade="'+esc(a.playerId)+'|'+esc(a.questionId)+'|'+p+'">'+p+'</button>').join("")+'</div></div>').join(""):'<p class="muted">Nog geen open antwoorden ingeleverd.</p>')+'</div>';
}
function reflections(){
 const r=data.reflections||[];
 const avg=r.length?(r.reduce((s,o)=>s+o.rating,0)/r.length).toFixed(1):"—";
 return '<div class="panel"><span class="eyebrow">TERUGBLIK & VOORUITBLIK</span><h2>Klasfeedback · '+esc(r.length)+' reacties</h2><p>Gemiddelde waardering: <strong>'+esc(avg)+' / 5</strong></p>'+r.slice(0,15).map(x=>'<div class="cardline"><b>'+esc(x.rating)+'/5 sterren</b><p>Hielp: '+esc(x.helped||"—")+'</p><p>Nog lastig: '+esc(x.hardest||"—")+'</p><p class="small muted">Volgende les: '+esc(x.next||"—")+'</p></div>').join("")+'</div>';
}
function dashboard(){
 const s=data.session,l=s.lesson;
 const content='<div class="row" style="margin-bottom:16px"><div><a class="small" href="docent.html" id="back">← Lesbibliotheek</a><h1 style="font-size:clamp(30px,4vw,45px);margin:10px 0 4px">'+esc(l.title)+'</h1><p class="muted">'+esc(l.level)+' · '+esc(l.content.tagline||"Aardrijkskunde")+'</p></div>'+levelPill(l.level)+'</div>'+stageCards()+report()+share()+controls()+'<div class="grid" style="margin-top:16px"><div class="col6">'+studentsPanel()+'</div><div class="col6">'+teamPanel()+'</div></div><div class="grid" style="margin-top:16px"><div class="col6">'+scorePanel()+'</div><div class="col6">'+grading()+'</div></div><div style="margin-top:16px">'+reflections()+'</div><div class="row" style="margin-top:15px"><span class="small muted">Je ziet alleen gegevens van deze lessessie.</span><button class="ghost small" id="finishLesson" '+(s.status==="finished"?"disabled":"")+'>Sluit lessessie af</button></div><div class="status" id="status" role="status"></div>';
 H.frame(content,"teacher",l.level);
 const back=$("#back");back.onclick=e=>{e.preventDefault();setCode("");listAll(true)};
 $("#copyLink").onclick=async()=>{try{await navigator.clipboard.writeText(link(s.code));msg("✓ Leerlinglink gekopieerd. Plak hem in SOMtoday.")}catch{msg("Gebruik de zichtbare link om te kopiëren.",true)}};
 $("#showIntro").onclick=()=>introOverlay();
 H.qsa("[data-action]").forEach(b=>b.onclick=()=>action(b.dataset.action,{}));
 H.qsa("[data-phase]").forEach(b=>b.onclick=()=>action("phase",{phase:+b.dataset.phase}));
 H.qsa("[data-mode]").forEach(b=>b.onclick=()=>action("mode",{mode:b.dataset.mode}));
 const auto=$("#autoTeams");if(auto)auto.onclick=()=>{if(data.students.length<2){msg("Er zijn minimaal twee leerlingen nodig.",true);return}makeTeams();dashboard()};
 H.qsa("[data-swap]").forEach(sel=>sel.onchange=e=>{
  if(!draftTeams)draftTeams=data.teams.map(o=>({name:o.name,members:[...o.members]}));
  const [teamIdx,memberIdx]=sel.dataset.swap.split(":").map(Number),newId=sel.value;
  const oldId=draftTeams[teamIdx].members[memberIdx];
  let found=false;for(let a=0;a<draftTeams.length;a++)for(let b=0;b<draftTeams[a].members.length;b++){
   if(draftTeams[a].members[b]===newId){draftTeams[a].members[b]=oldId;found=true;break}
   if(found)break;
  }
  draftTeams[teamIdx].members[memberIdx]=newId;dashboard();
 });
 const save=$("#saveTeams");if(save)save.onclick=async()=>{if(!draftTeams){msg("Er zijn geen nieuwe wijzigingen.");return}await action("teams",{teams:draftTeams});draftTeams=null;await refresh(true)};
 const pub=$("#publishTeams");if(pub)pub.onclick=()=>action("publish",{});
 const reveal=$("#reveal");if(reveal)reveal.onclick=()=>{if(confirm("Wil je de winnaar nu onthullen voor alle leerlingen?"))action("reveal",{})};
 H.qsa("[data-grade]").forEach(b=>b.onclick=async()=>{const [p,q,pts]=b.dataset.grade.split("|");try{await H.rpc("teacher","gfr_grade",{p_code:code,p_player:p,p_question:q,p_points:+pts});await refresh(true);msg("✓ Beoordeling opgeslagen")}catch(err){msg("Beoordelen mislukt: "+err.message,true)}});
 $("#finishLesson").onclick=()=>{if(confirm("Deze lessessie afsluiten? Leerlingen kunnen daarna niets meer insturen."))action("finish",{})};
}
function introOverlay(){
 const l=data.session.lesson,c=l.content.intro||{};
 const overlay=document.createElement("div");overlay.id="introOverlay";overlay.style.cssText="position:fixed;inset:0;z-index:1000;background:radial-gradient(circle at 50% 25%,#195e76,#071625 72%);display:grid;place-items:center;padding:25px;text-align:center;color:white";
 overlay.innerHTML='<div style="max-width:1050px"><div class="introIcon">⚡</div><div class="eyebrow">MARIS COLLEGE · GEO FUTURE ROUTE · '+esc(l.level)+'</div><h1 class="introTitle" style="font-size:clamp(42px,8vw,110px);margin:35px 0 12px">'+esc(c.title||l.title)+'</h1><p class="lead" style="margin:auto auto 34px">'+esc(c.subtitle||"De missie begint")+'</p><div class="actions" style="justify-content:center"><button id="soundIntro" class="primary">♫ Speel de opening</button><button id="closeIntro" class="ghost">Sluit presentatie</button></div><div style="color:#b1d1dc;margin-top:28px">Aardrijkskunde '+esc(l.level)+' · Lescode '+esc(data.session.code)+'</div></div>';
 document.body.append(overlay);
 $("#closeIntro").onclick=()=>overlay.remove();$("#soundIntro").onclick=()=>H.makeIntroSound();
 overlay.onkeydown=e=>{if(e.key==="Escape")overlay.remove()};
}
async function action(a,payload){
 if(busy)return;busy=true;
 msg("Wijziging veilig opslaan…");
 try{await H.rpc("teacher","gfr_teacher_action",{p_code:code,p_action:a,p_payload:payload});await refresh(true);msg("✓ Instelling opgeslagen en doorgegeven aan de leerlinglaptops.")}
 catch(err){msg("Niet gelukt: "+err.message,true)}
 finally{busy=false}
}
async function refresh(force=false){
 if(!code||polling||busy&&!force)return;
 polling=true;
 try{
  const fresh=await H.rpc("teacher","gfr_teacher_state",{p_code:code});
  const sig=JSON.stringify({status:fresh.session.status,phase:fresh.session.phase,mode:fresh.session.mode,published:fresh.session.published,revealed:fresh.session.revealed,
    students:fresh.students.map(s=>[s.id,s.counts,s.points]),scores:fresh.teams.map(t=>t.score.score),answers:fresh.answers.length,reflections:fresh.reflectionCount});
  data=fresh;
  if(force||sig!==viewVersion&&!H.isTyping()&&!draftTeams){viewVersion=sig;dashboard()}
 }catch(err){if(force){if(!data){setCode("");login("Dashboard niet geladen: "+err.message)}else msg("Verbinding: "+err.message,true)}else console.warn("Docentsynchronisatie:",err.message)}
 finally{polling=false}
}
function startPolling(){if(window.gfrTeacherPoll)return;window.gfrTeacherPoll=setInterval(()=>{if(document.visibilityState==="visible"&&code)refresh(false)},5000);window.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&code)refresh(false)})}
async function init(){
 try{
  if(await H.token("teacher")){
   logged=true;
   if(code){await refresh(true);startPolling()}else await listAll(true);
  }else login();
 }catch(err){login("Je kunt opnieuw inloggen. "+err.message)}
}
window.addEventListener("error",e=>{console.error("GFR docent:",e.message);msg("Er ging iets mis: "+e.message,true)});
init();
})();
