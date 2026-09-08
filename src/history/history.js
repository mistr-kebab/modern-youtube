function formatTime(s) {
  if (!s || s < 1) return "0m";
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s/60)}m ${Math.round(s%60)}s`;
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60);
  return `${h}h ${m}m`;
}
function formatClock(s) {
  if (!isFinite(s) || s < 0) return "0:00";
  s = Math.floor(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${m}:${String(sec).padStart(2,"0")}`;
}
function localDayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function formatDate(ts) {
  const d=new Date(ts), now=new Date();
  const todayKey = localDayKey(now);
  const itemKey = localDayKey(d);
  if (itemKey === todayKey) return "Today";
  const yesterday = new Date(now); yesterday.setDate(now.getDate()-1);
  if (itemKey === localDayKey(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined,{ weekday:"short", month:"short", day:"numeric", year: d.getFullYear()!==now.getFullYear() ? "numeric" : undefined });
}

const els = { list: document.getElementById("list"), empty: document.getElementById("empty"), search: document.getElementById("search"), count: document.getElementById("count"), totalTime: document.getElementById("totalTime"), avgTime: document.getElementById("avgTime"), days: document.getElementById("days"), toast: document.getElementById("toast"), clear: document.getElementById("clear"),
  modal: document.getElementById("videoModal"), modalThumb: document.getElementById("modalThumb"), modalTitle: document.getElementById("modalTitle"), modalChannel: document.getElementById("modalChannel"), modalMeta: document.getElementById("modalMeta"), modalWatch: document.getElementById("modalWatch"), modalContinue: document.getElementById("modalContinue"),
  currentlyWatching: document.getElementById("currentlyWatching") };
let all = [];
let resumeMap = {};
let pendingNeedsRender = false;

function toast(msg) { if(!els.toast) return; els.toast.textContent=msg; els.toast.classList.add("show"); setTimeout(()=>els.toast.classList.remove("show"),1800); }

function getProgress(e) {
  const pos = (e.position && e.duration) ? e.position : (resumeMap[e.videoId]?.position || 0);
  const dur = (e.position && e.duration) ? e.duration : (resumeMap[e.videoId]?.duration || 0);
  if (pos > 0 && dur > 0 && pos < dur) return { pos, dur, has: true };
  return { pos: 0, dur: 0, has: false };
}

function openModal(entry) {
  if (!els.modal || !entry) return;
  const vid = entry.videoId;
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(vid)}`;
  const prog = getProgress(entry);
  const thumb = entry.thumb || `https://i.ytimg.com/vi/${encodeURIComponent(vid)}/hqdefault.jpg`;
  els.modalThumb.src = thumb;
  els.modalThumb.alt = entry.title || "";
  els.modalThumb.onerror = () => { els.modalThumb.style.opacity = 0.5; };
  els.modalTitle.textContent = entry.title || "Untitled";
  const channelName = entry.channel || "Unknown channel";
  els.modalChannel.textContent = channelName;
  els.modalChannel.href = entry.channelUrl ? entry.channelUrl : (channelName !== "Unknown channel" ? `https://www.youtube.com/results?search_query=${encodeURIComponent(channelName)}` : watchUrl);
  const dateStr = new Date(entry.firstWatched || entry.lastWatched).toLocaleString(undefined, { weekday:"short", year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
  const watchedStr = prog.has ? `${formatClock(prog.pos)} / ${formatClock(prog.dur)}` : formatTime(entry.watchedSeconds||0);
  els.modalMeta.innerHTML = `<span><i class="fa-solid ${prog.has ? "fa-circle-play" : "fa-clock"}"></i> ${escapeHtml(watchedStr)}</span><span>${escapeHtml(dateStr)}</span>`;
  const isContinue = prog.has && prog.pos > 8 && prog.pos < prog.dur - 10;
  const wasWatched = (entry.watchedSeconds||0) > 0 || prog.has;
  const isRewatch = !isContinue && wasWatched;
  els.modalWatch.href = watchUrl;
  els.modalWatch.innerHTML = isRewatch ? `<i class="fa-solid fa-rotate-right"></i> Watch again` : `<i class="fa-solid fa-play"></i> Watch`;
  if (isContinue) {
    els.modalContinue.href = `${watchUrl}&t=${Math.floor(prog.pos)}s`;
    els.modalContinue.style.display = "inline-flex";
    els.modalContinue.innerHTML = `Continue watching <span style="opacity:0.8"> ${formatClock(prog.pos)} / ${formatClock(prog.dur)}</span> <i class="fa-solid fa-play" style="margin-left:6px"></i>`;
  } else {
    els.modalContinue.style.display = "none";
  }
  els.modal.classList.add("open");
  els.modal.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  if (!els.modal) return;
  els.modal.classList.remove("open");
  els.modal.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}
function renderCurrentlyWatching(filtered) {
  const c = els.currentlyWatching;
  if (!c) return;
  if (!filtered || !filtered.length) { c.classList.remove("show"); c.style.display="none"; return; }
  // pick most recent with progress, otherwise most recent within 2h
  const withProgress = filtered.find(e=> getProgress(e).has);
  let candidate = withProgress;
  if (!candidate) {
    const recent = filtered[0];
    if (recent && (Date.now() - recent.lastWatched) < 2*60*60*1000) candidate = recent;
  }
  if (!candidate) { c.classList.remove("show"); c.style.display="none"; return; }
  const vid = candidate.videoId;
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(vid)}`;
  const prog = getProgress(candidate);
  const thumb = candidate.thumb || `https://i.ytimg.com/vi/${encodeURIComponent(vid)}/hqdefault.jpg`;
  const channelName = candidate.channel || "Unknown channel";
  const channelHref = candidate.channelUrl ? candidate.channelUrl : (channelName !== "Unknown channel" ? `https://www.youtube.com/results?search_query=${encodeURIComponent(channelName)}` : watchUrl);
  const timeDisplay = prog.has ? `${formatClock(prog.pos)} / ${formatClock(prog.dur)}` : formatTime(candidate.watchedSeconds||0);
  const pct = prog.has ? Math.min(100, Math.max(0, (prog.pos / prog.dur)*100)) : 0;
  const continueUrl = prog.has ? `${watchUrl}&t=${Math.floor(prog.pos)}s` : watchUrl;
  const isContinue = prog.has && prog.pos > 8 && prog.pos < prog.dur - 10;
  const wasWatched = (candidate.watchedSeconds||0) > 0 || prog.has;
  const isRewatch = !isContinue && wasWatched;
  const btnLabel = isContinue ? `Continue watching <i class="fa-solid fa-play" style="margin-left:6px"></i>` : isRewatch ? `Watch again <i class="fa-solid fa-rotate-right" style="margin-left:6px"></i>` : `<i class="fa-solid fa-play"></i> Watch`;
  const btnHref = isContinue ? continueUrl : watchUrl;
  c.innerHTML = `<div class="currently-head"><span class="dot"></span> Currently watching <span style="margin-left:auto; font-size:10px; color:var(--muted)">${new Date(candidate.firstWatched || candidate.lastWatched).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>
    <div class="currently-main">
      <img class="currently-thumb" src="${escapeHtml(thumb)}" alt="" data-vid="${escapeHtml(vid)}">
      <div>
        <div class="currently-title" data-vid="${escapeHtml(vid)}" title="${escapeHtml(candidate.title)}">${escapeHtml(candidate.title)}</div>
        <div class="currently-channel"><a href="${escapeHtml(channelHref)}" target="_blank" rel="noopener">${escapeHtml(channelName)}</a></div>
        <div class="currently-progress"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><span>${escapeHtml(timeDisplay)}</span></div>
        <div class="currently-actions"><a class="continue-btn" href="${escapeHtml(btnHref)}" target="_blank" rel="noopener">${btnLabel}</a><a class="btn-ghost" href="${escapeHtml(watchUrl)}" target="_blank" rel="noopener" style="padding:8px 12px; font-size:11px; text-decoration:none; display:inline-flex; align-items:center; justify-content:center;"><i class="fa-solid fa-arrow-up-right-from-square" style="margin-right:6px"></i> Open</a></div>
      </div>
    </div>`;
  c.classList.add("show");
  c.style.display="grid";
  c.querySelectorAll(".currently-thumb, .currently-title").forEach(el=> el.addEventListener("click", ()=> openModal(candidate)));
}

function render(filter="") {
  try {
    const q=filter.toLowerCase().trim();
    const cutoff = Date.now() - 30*24*60*60*1000;
    let filtered = all.filter(e=> e.lastWatched >= cutoff);
    if (q) filtered = filtered.filter(e=> (e.title+" "+(e.channel||"")).toLowerCase().includes(q));
    const totalSec = filtered.reduce((a,e)=>a+(e.watchedSeconds||0),0);
    const activeDays = new Set(filtered.map(e=> localDayKey(new Date(e.firstWatched || e.lastWatched)))).size;
    if (els.count) els.count.textContent = filtered.length;
    if (els.totalTime) els.totalTime.textContent = formatTime(totalSec);
    if (els.avgTime) els.avgTime.textContent = filtered.length ? formatTime(totalSec/filtered.length) : "0m";
    if (els.days) els.days.textContent = activeDays;
    renderCurrentlyWatching(filtered);
    if (!filtered.length) { if (els.list) els.list.innerHTML=""; if (els.empty) els.empty.style.display="block"; return; }
    if (els.empty) els.empty.style.display="none";
    if (!els.list) return;
    const groups = new Map();
    for (const e of filtered) {
      const k = localDayKey(new Date(e.firstWatched || e.lastWatched));
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e);
    }
    const sortedKeys = [...groups.keys()].sort((a,b)=> b.localeCompare(a));
    let html="";
    for (const key of sortedKeys) {
      const items = groups.get(key);
      const dateLabel = formatDate(items[0].firstWatched || items[0].lastWatched);
      html += `<div class="group-head">${escapeHtml(dateLabel)} · ${items.length} video${items.length>1?"s":""} · ${escapeHtml(formatTime(items.reduce((a,e)=>a+(e.watchedSeconds||0),0)))} </div>`;
      for (const e of items) {
        const vid = String(e.videoId||"").trim();
        if (!vid) continue;
        const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(vid)}`;
        const prog = getProgress(e);
        const timeDisplay = prog.has ? `${formatClock(prog.pos)} / ${formatClock(prog.dur)}` : formatTime(e.watchedSeconds||0);
        const timeIcon = prog.has ? "fa-solid fa-circle-play" : "fa-solid fa-clock";
        const continueUrl = prog.has ? `${watchUrl}&t=${Math.floor(prog.pos)}s` : watchUrl;
        const channelName = e.channel || "Unknown channel";
        const channelHref = e.channelUrl ? e.channelUrl : (channelName && channelName!=="Unknown channel" ? `https://www.youtube.com/results?search_query=${encodeURIComponent(channelName)}` : watchUrl);
        const channelHtml = `<a class="channel-link" href="${escapeHtml(channelHref)}" target="_blank" rel="noopener" title="${escapeHtml(channelName)}">${escapeHtml(channelName)}</a>`;
        const thumb = e.thumb || `https://i.ytimg.com/vi/${encodeURIComponent(vid)}/hqdefault.jpg`;
        const isContinue = prog.has && prog.pos > 8 && prog.pos < prog.dur - 10;
        const wasWatched = (e.watchedSeconds||0) > 0 || prog.has;
        const isRewatch = !isContinue && wasWatched;
        const btnClass = isContinue || isRewatch ? "continue-btn" : "go";
        const btnLabel = isContinue ? `Continue watching <i class="fa-solid fa-play" style="margin-left:6px"></i>` : isRewatch ? `Watch again <i class="fa-solid fa-rotate-right" style="margin-left:6px"></i>` : `<i class="fa-solid fa-play"></i>`;
        const btnTitle = isContinue ? "Continue watching" : isRewatch ? "Watch again" : "Watch";
        const btnHref = isContinue ? continueUrl : watchUrl;
        html += `<div class="item" data-vid="${escapeHtml(vid)}">
          <div class="thumb-link"><img src="${escapeHtml(thumb)}" loading="lazy" data-fallback="1" alt=""></div>
          <div class="meta">
            <div class="t" title="${escapeHtml(e.title)}">${escapeHtml(e.title)}</div>
            <div class="c">${channelHtml}</div>
            <div class="w"><span><i class="${timeIcon}"></i> ${escapeHtml(timeDisplay)}</span><span class="last-watched">${new Date(e.firstWatched || e.lastWatched).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${new Date(e.firstWatched || e.lastWatched).toLocaleDateString()}</span></div>
          </div>
          <a class="${btnClass}" href="${escapeHtml(btnHref)}" target="_blank" rel="noopener" title="${escapeHtml(btnTitle)}" data-no-modal="1">${btnLabel}</a>
        </div>`;
      }
    }
    els.list.innerHTML = html;
    for (const img of els.list.querySelectorAll('img[data-fallback="1"]')) {
      img.addEventListener("error", () => { img.style.opacity = 0.3; img.style.background="#1a1a1a"; }, { once: true });
    }
  } catch (err) {
    console.error("[History] render error", err);
    if (els.list) els.list.innerHTML = `<div class="empty">Error loading history.</div>`;
  }
}

function load() {
  try {
    if (!chrome?.storage?.local) { all=[]; resumeMap={}; render(els.search?.value||""); return; }
    chrome.storage.local.get({ watchHistory:[], resumePositions:{}, dailyWatchTime:{} }, (data)=>{
      try {
        all = Array.isArray(data.watchHistory) ? data.watchHistory.slice().sort((a,b)=> b.lastWatched - a.lastWatched) : [];
        resumeMap = data.resumePositions && typeof data.resumePositions==="object" ? data.resumePositions : {};
        render(els.search?.value||"");
      } catch (e) { console.error(e); }
    });
  } catch (e) { console.error(e); }
}
if (els.search) els.search.addEventListener("input", ()=> render(els.search.value));
if (els.clear) els.clear.addEventListener("click", ()=>{
  if(!confirm("Clear all watch history (30 days)? This also clears saved resume positions.")) return;
  chrome.storage.local.set({ watchHistory:[], dailyWatchTime:{}, resumePositions:{} }, ()=>{
    all=[]; resumeMap={}; render(""); toast("History cleared");
  });
});
if (els.list) els.list.addEventListener("click", (e)=>{
  const noModal = e.target.closest("[data-no-modal]");
  const channelLink = e.target.closest(".channel-link");
  if (noModal || channelLink) return;
  const item = e.target.closest(".item[data-vid]");
  if (!item) return;
  const vid = item.getAttribute("data-vid");
  const entry = all.find(x=>x.videoId===vid) || null;
  if (entry) {
    e.preventDefault();
    openModal(entry);
  }
});
if (els.modal) {
  els.modal.querySelector(".modal-backdrop")?.addEventListener("click", closeModal);
  els.modal.querySelector(".modal-close")?.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && els.modal.classList.contains("open")) closeModal(); });
}
const _origCloseModal = closeModal;
closeModal = function() {
  if (!els.modal) return;
  els.modal.classList.remove("open");
  els.modal.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
  if (pendingNeedsRender) { pendingNeedsRender = false; render(els.search?.value||""); }
};
if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area)=>{
    if(area!=="local") return;
    let needsRender=false;
    if(changes.watchHistory) { all=(changes.watchHistory.newValue||[]).slice().sort((a,b)=>b.lastWatched-a.lastWatched); needsRender=true; }
    if(changes.resumePositions) { resumeMap = changes.resumePositions.newValue||{}; needsRender=true; }
    if(needsRender) {
      if (els.modal && els.modal.classList.contains("open")) { pendingNeedsRender = true; return; }
      render(els.search?.value||"");
    }
  });
}

load();
