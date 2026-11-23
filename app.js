const API_URL = "./api/giveaways";
const GAMERPOWER_URL = "https://www.gamerpower.com/api/giveaways";
const state = {items:[], types:new Set(["game","dlc","loot","beta"]), platform:"all", query:"", ending:false, sort:"ending", current:null, social:"discord"};
const $ = (id) => document.getElementById(id);
const escapeHtml = (value="") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clean = v => String(v || "").trim();
function classifyType(raw, title="", description="") {
  const t = `${raw} ${title} ${description}`.toLowerCase();
  if (t.includes("beta") || t.includes("playtest") || t.includes("early access")) return "beta";
  if (t.includes("dlc") || t.includes("expansion") || t.includes("season pass")) return "dlc";
  if (raw.toLowerCase().includes("loot") || t.includes("skin") || t.includes("in-game") || t.includes("in game")) return "loot";
  return "game";
}
function normalizeGamerPower(x) {
  const title = clean(x.title);
  const rawType = clean(x.type || "Game");
  const type = classifyType(rawType, title, x.description);
  return {
    id:`gp-${x.id || title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
    title, description:clean(x.description), type, typeLabel: type==="game"?"Full game":type==="beta"?"Beta access":type==="dlc"?"DLC":"In-game loot",
    platform:clean(x.platforms || "Multiple platforms"), store:clean(x.platforms || "Giveaway"), image:clean(x.image), thumbnail:clean(x.thumbnail),
    url:clean(x.open_giveaway_url || x.giveaway_url), source:"GamerPower", endDate:clean(x.end_date), published:clean(x.published_date), worth:clean(x.worth), instructions:clean(x.instructions)
  };
}
function parseDate(s) {
  if (!s || s==="N/A") return null;
  const d = new Date(s.replace(" ","T") + (s.includes("Z") ? "" : "Z"));
  return Number.isNaN(d.getTime()) ? null : d;
}
function timeLeft(s) {
  const d=parseDate(s); if(!d) return "No announced end date";
  const ms=d-Date.now(); if(ms<=0) return "Offer may have ended";
  const h=Math.floor(ms/3600000), days=Math.floor(h/24);
  if(days>0) return `Ends in ${days}d ${h%24}h`;
  if(h>0) return `Ends in ${h}h`;
  return `Ends in ${Math.max(1,Math.floor(ms/60000))}m`;
}
function isEndingSoon(x) { const d=parseDate(x.endDate); return d && d>Date.now() && d-Date.now()<=48*3600000; }
async function fetchOffers() {
  setStatus("Refreshing giveaway sources…");
  $("errorNotice").classList.add("hidden");
  $("refreshBtn").disabled=true;
  try {
    let response;
    try { response=await fetch(`${API_URL}?_=${Date.now()}`,{cache:"no-store"}); if(!response.ok) throw new Error("Backend unavailable"); }
    catch (_) { response=await fetch(`${GAMERPOWER_URL}?_=${Date.now()}`,{cache:"no-store"}); }
    if(!response.ok) throw new Error(`Giveaway source returned ${response.status}`);
    const data=await response.json();
    const raw=Array.isArray(data)?data:(Array.isArray(data.giveaways)?data.giveaways:[]);
    const unique=new Map();
    raw.map(normalizeGamerPower).filter(x=>x.title && x.url).forEach(x=>{
      const key=x.title.toLowerCase().replace(/[^a-z0-9]/g,"");
      if(!unique.has(key)) unique.set(key,x);
    });
    state.items=[...unique.values()];
    populatePlatforms(); render();
    $("lastUpdated").textContent=`Updated ${new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`;
    setStatus("Live · GamerPower");
    if(!state.items.length) throw new Error("The source returned no active offers. Try again shortly.");
  } catch(err) {
    setStatus("Source unavailable");
    $("errorNotice").textContent=`We couldn't retrieve live giveaway data. ${err.message}. You can still use the filters once the source is reachable.`;
    $("errorNotice").classList.remove("hidden");
    if(!state.items.length) render();
  } finally { $("refreshBtn").disabled=false; }
}
function setStatus(s){$("sourceStatus").textContent=s;}
function populatePlatforms(){
  const select=$("platformSelect"), current=select.value;
  const platforms=[...new Set(state.items.flatMap(x=>x.platform.split(",").map(p=>p.trim()).filter(Boolean)))].sort();
  select.innerHTML='<option value="all">All platforms</option>'+platforms.map(p=>`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
  if(platforms.includes(current))select.value=current;
}
function getFiltered(){
  let arr=state.items.filter(x=>{
    const typeOk=state.types.has("all")||state.types.has(x.type);
    const platformOk=state.platform==="all"||x.platform.toLowerCase().includes(state.platform.toLowerCase());
    const q=state.query.toLowerCase();
    const searchOk=!q||`${x.title} ${x.description} ${x.platform} ${x.store}`.toLowerCase().includes(q);
    return typeOk&&platformOk&&searchOk&&(!state.ending||isEndingSoon(x));
  });
  if(state.sort==="title")arr.sort((a,b)=>a.title.localeCompare(b.title));
  else if(state.sort==="newest")arr.sort((a,b)=>(parseDate(b.published)||0)-(parseDate(a.published)||0));
  else arr.sort((a,b)=>(parseDate(a.endDate)||new Date("2999-01-01"))-(parseDate(b.endDate)||new Date("2999-01-01")));
  return arr;
}
function render(){
  const arr=getFiltered(), grid=$("giveawayGrid");
  $("resultCount").textContent=`${arr.length} ${arr.length===1?"offer":"offers"} found`;
  $("statActive").textContent=state.items.length;
  $("statEnding").textContent=state.items.filter(isEndingSoon).length;
  $("emptyState").classList.toggle("hidden",arr.length!==0);
  grid.innerHTML=arr.map(x=>{
    const img=x.image||x.thumbnail, soon=isEndingSoon(x), deadline=timeLeft(x.endDate);
    return `<article class="game-card">
      <div class="card-art">${img?`<img src="${escapeHtml(img)}" alt="${escapeHtml(x.title)} artwork" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.classList.remove('hidden')"><div class="art-placeholder hidden">✦</div>`:`<div class="art-placeholder">✦</div>`}<span class="offer-type">${escapeHtml(x.typeLabel)}</span></div>
      <div class="card-body"><h3 class="card-title">${escapeHtml(x.title)}</h3>
      <div class="card-meta"><span class="meta-tag">${escapeHtml(x.platform)}</span><span class="meta-tag">${escapeHtml(x.source)}</span>${x.worth?`<span class="meta-tag">${escapeHtml(x.worth)}</span>`:""}</div>
      <div class="card-deadline ${soon?"soon":""}">◷ &nbsp;${escapeHtml(deadline)}</div>
      <div class="card-actions"><a class="claim-link" href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer">Claim offer ↗</a><button class="share-button" data-share="${escapeHtml(x.id)}">Share ↗</button></div></div></article>`;
  }).join("");
  grid.querySelectorAll("[data-share]").forEach(b=>b.addEventListener("click",()=>openShare(state.items.find(x=>x.id===b.dataset.share))));
}
function formatDate(s){const d=parseDate(s);return d?d.toLocaleString(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"Not specified by provider";}
function makeMessage(x,platform){
  const link=x.url, end=x.endDate&&x.endDate!=="N/A"?formatDate(x.endDate):"Check the giveaway page for the deadline";
  const category=x.typeLabel.toUpperCase(), title=x.title, store=x.platform;
  if(platform==="discord")return `🎮 **FREE ${category} GIVEAWAY!** 🎮\n\n⚔️ **${title}**\n🕹️ Platform: ${store}\n⏳ Giveaway ends: ${end}\n\n🎁 [CLAIM IT HERE](${link})\n\nFound via **Liberum Ludos** — share the adventure!`;
  if(platform==="x")return `🎮 FREE ${category}: ${title}\n🕹️ ${store}\n⏳ Ends: ${end}\nClaim: ${link}\n\n#FreeGames #Gaming #Giveaway`;
  if(platform==="reddit")return `## ${title} — FREE ${category}\n\n**Platform:** ${store}\n**Giveaway ends:** ${end}\n\n[Claim the offer here](${link})\n\n_Discovered through Liberum Ludos. Check the giveaway page for regional restrictions and eligibility._`;
  if(platform==="facebook")return `🎮 FREE GAME GIVEAWAY! 🎮\n\n${title} is available as a ${category.toLowerCase()} on ${store}.\n\n⏳ Giveaway ends: ${end}\n\nClaim it here: ${link}\n\nDiscover more free games with Liberum Ludos!`;
  if(platform==="bluesky")return `🎮 FREE ${category}: ${title}\nPlatform: ${store}\nEnds: ${end}\nClaim it: ${link}\n\n#FreeGames #Gaming`;
  return `🎮 FREE ${category}: ${title}\n\nPlatform: ${store}\nGiveaway ends: ${end}\n\nClaim here:\n${link}\n\nvia Liberum Ludos`;
}
function openShare(x){
  if(!x)return;state.current=x;state.social="discord";
  $("shareTitle").textContent=x.title;$("shareSubtitle").textContent=`${x.typeLabel} · ${x.platform} · ${timeLeft(x.endDate)}`;
  document.querySelectorAll(".platform-tab").forEach(b=>b.classList.toggle("active",b.dataset.platform==="discord"));
  $("shareText").value=makeMessage(x,"discord");$("shareDialog").showModal();
}
document.querySelectorAll(".platform-tab").forEach(b=>b.addEventListener("click",()=>{state.social=b.dataset.platform;document.querySelectorAll(".platform-tab").forEach(t=>t.classList.toggle("active",t===b));if(state.current)$("shareText").value=makeMessage(state.current,state.social);}));
$("copyMessageBtn").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("shareText").value);$("copyMessageBtn").textContent="Copied!";setTimeout(()=>$("copyMessageBtn").textContent="Copy message",1500);}catch(e){$("shareText").select();document.execCommand("copy");}});
function loadImage(url){return new Promise(resolve=>{if(!url)return resolve(null);const im=new Image();im.crossOrigin="anonymous";im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=url;});}
$("downloadCardBtn").addEventListener("click",async()=>{
  const x=state.current;if(!x)return;const c=$("shareCanvas"),ctx=c.getContext("2d"),img=await loadImage(x.image||x.thumbnail);
  const grad=ctx.createLinearGradient(0,0,1200,630);grad.addColorStop(0,"#111216");grad.addColorStop(1,"#292319");ctx.fillStyle=grad;ctx.fillRect(0,0,1200,630);
  ctx.strokeStyle="#9b7b43";ctx.lineWidth=2;ctx.strokeRect(30,30,1140,570);ctx.strokeStyle="#4c402a";ctx.strokeRect(42,42,1116,546);
  if(img){ctx.save();ctx.globalAlpha=.32;const scale=Math.max(1200/img.width,630/img.height);const w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(1200-w)/2,(630-h)/2,w,h);ctx.restore();ctx.fillStyle="#101115b8";ctx.fillRect(0,0,1200,630);}
  ctx.fillStyle="#d9bd7b";ctx.font="600 20px Georgia";ctx.fillText("⚔  LIBERUM LUDOS",78,100);
  ctx.fillStyle="#a99b7a";ctx.font="14px Arial";ctx.fillText("THE ARCHIVE OF FREE GAMES",80,128);
  ctx.fillStyle="#e5ca88";ctx.font="bold 17px Arial";ctx.fillText(`FREE ${x.typeLabel.toUpperCase()}`,80,220);
  ctx.fillStyle="#f3eee3";ctx.font="bold 48px Georgia";wrapText(ctx,x.title,80,285,1020,58,3);
  ctx.fillStyle="#c6c0b4";ctx.font="22px Arial";ctx.fillText(`Platform: ${x.platform}`,80,455);
  ctx.fillStyle="#e2c783";ctx.font="21px Arial";ctx.fillText(`Giveaway ends: ${x.endDate&&x.endDate!=="N/A"?formatDate(x.endDate):"See claim page"}`,80,500);
  ctx.fillStyle="#d5b66f";ctx.font="18px Arial";ctx.fillText("CLAIM THE OFFER  ·  LINK IN POST",80,555);
  const a=document.createElement("a");a.download=`liberum-ludos-${x.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,45)}.png`;a.href=c.toDataURL("image/png");a.click();
});
function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines){let words=text.split(" "),line="",lines=0;for(let n=0;n<words.length;n++){const test=line+words[n]+" ";if(ctx.measureText(test).width>maxWidth&&n>0){ctx.fillText(line,x,y);line=words[n]+" ";y+=lineHeight;lines++;if(lines>=maxLines-1)break;}else line=test;}ctx.fillText(line,x,y);}
$("refreshBtn").addEventListener("click",fetchOffers);
$("searchInput").addEventListener("input",e=>{state.query=e.target.value;render();});
$("sortSelect").addEventListener("change",e=>{state.sort=e.target.value;render();});
$("platformSelect").addEventListener("change",e=>{state.platform=e.target.value;render();});
$("endingToggle").addEventListener("change",e=>{state.ending=e.target.checked;render();});
$("typeFilters").addEventListener("click",e=>{
  const b=e.target.closest("[data-type]");if(!b)return;const t=b.dataset.type;
  if(t==="all"){state.types=new Set(["all"]);}else{state.types.delete("all");if(state.types.has(t))state.types.delete(t);else state.types.add(t);if(!state.types.size)state.types=new Set(["all"]);}
  document.querySelectorAll("#typeFilters .chip").forEach(c=>c.classList.toggle("active",c.dataset.type==="all"?state.types.has("all"):state.types.has(c.dataset.type)));
  render();
});
$("clearFiltersBtn").addEventListener("click",()=>{state.types=new Set(["all"]);state.platform="all";state.query="";state.ending=false;$("searchInput").value="";$("platformSelect").value="all";$("endingToggle").checked=false;document.querySelectorAll("#typeFilters .chip").forEach(c=>c.classList.toggle("active",c.dataset.type==="all"));render();});
fetchOffers();
