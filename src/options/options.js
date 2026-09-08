const DEFAULT_SETTINGS = {
  autoSkipAd: true,
  sponsorBlockEnabled: true,
  hideShorts: true,
  hidePlayables: true,
  customVolumeUI: true,
  customBackgroundEnabled: false,
  customBackgroundOpacity: 35,
  customBackgroundBlur: 0,
  customBackgroundFit: "cover",
  customBackgroundPosition: "center",
  modernPlayer: false,
  minimalHeader: false,
  focusHideMixes: false,
  focusHideRecommended: false,
  focusHideComments: false,
  accentColor: "#f1f1f1",
  customCssEnabled: false,
  perfAggressiveFeedCleaning: false,
  perfDisableBackgroundFx: false,
  perfDisableAnimations: false,
  perfReduceHistoryFrequency: false,
  categories: { sponsor: true, intro: true, outro: true, interaction: true, selfpromo: true, music_offtopic: false },
  skipNotice: true
};

const els = {
  statAds: document.getElementById("statAds"),
  statSponsors: document.getElementById("statSponsors"),
  statTime: document.getElementById("statTime"),
  statAdsDetail: document.getElementById("statAdsDetail"),
  statSponsorsDetail: document.getElementById("statSponsorsDetail"),
  statTimeDetail: document.getElementById("statTimeDetail"),
  statAdsDetail2: document.getElementById("statAdsDetail2"),
  statSponsorsDetail2: document.getElementById("statSponsorsDetail2"),
  resetStats: document.getElementById("resetStats"),
  resetAllSettings: document.getElementById("resetAllSettings"),
  watchToday: document.getElementById("watchToday"),
  watchWeek: document.getElementById("watchWeek"),
  watchMonth: document.getElementById("watchMonth"),
  historyList: document.getElementById("historyList"),
  historyListFull: document.getElementById("historyListFull"),
  historySearch: document.getElementById("historySearch"),
  clearHistory: document.getElementById("clearHistory"),
  clearHistory2: document.getElementById("clearHistory2"),
  autoSkipAd: document.getElementById("autoSkipAd"),
  hideShorts: document.getElementById("hideShorts"),
  hidePlayables: document.getElementById("hidePlayables"),
  customVolumeUI: document.getElementById("customVolumeUI"),
  skipNotice: document.getElementById("skipNotice"),
  sponsorBlockEnabled: document.getElementById("sponsorBlockEnabled"),
  categories: document.getElementById("categories"),
  customBackgroundEnabled: document.getElementById("customBackgroundEnabled"),
  bgControls: document.getElementById("bgControls"),
  bgPreview: document.getElementById("bgPreview"),
  bgFile: document.getElementById("bgFile"),
  bgClear: document.getElementById("bgClear"),
  bgUrl: document.getElementById("bgUrl"),
  bgUrlApply: document.getElementById("bgUrlApply"),
  bgOpacity: document.getElementById("bgOpacity"),
  bgOpacityVal: document.getElementById("bgOpacityVal"),
  bgBlur: document.getElementById("bgBlur"),
  bgBlurVal: document.getElementById("bgBlurVal"),
  bgFit: document.getElementById("bgFit"),
  bgPosition: document.getElementById("bgPosition"),
  bgVideoFile: document.getElementById("bgVideoFile"),
  bgVideoClear: document.getElementById("bgVideoClear"),
  bgVideoUrl: document.getElementById("bgVideoUrl"),
  bgVideoUrlApply: document.getElementById("bgVideoUrlApply"),
  bgVideoPreview: document.getElementById("bgVideoPreview"),
  modernPlayer: document.getElementById("modernPlayer"),
  minimalHeader: document.getElementById("minimalHeader"),
  focusHideMixes: document.getElementById("focusHideMixes"),
  focusHideRecommended: document.getElementById("focusHideRecommended"),
  focusHideComments: document.getElementById("focusHideComments"),
  accentColor: document.getElementById("accentColor"),
  customCssEnabled: document.getElementById("customCssEnabled"),
  customCssText: document.getElementById("customCssText"),
  perfAggressiveFeedCleaning: document.getElementById("perfAggressiveFeedCleaning"),
  perfSponsorBlock: document.getElementById("perfSponsorBlock"),
  perfDisableBackgroundFx: document.getElementById("perfDisableBackgroundFx"),
  perfDisableAnimations: document.getElementById("perfDisableAnimations"),
  perfReduceHistoryFrequency: document.getElementById("perfReduceHistoryFrequency"),
  toast: document.getElementById("toast"),
  modal: document.getElementById("videoModal"), modalThumb: document.getElementById("modalThumb"), modalTitle: document.getElementById("modalTitle"), modalChannel: document.getElementById("modalChannel"), modalMeta: document.getElementById("modalMeta"), modalWatch: document.getElementById("modalWatch"), modalContinue: document.getElementById("modalContinue"),
  currentlyWatchingDash: document.getElementById("currentlyWatchingDash"), currentlyWatchingHistory: document.getElementById("currentlyWatchingHistory"),
};

function formatTime(s) {
  if (!s || s < 1) return "0m";
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
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
function toast(msg) {
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 1800);
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function localDayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

// Nav with slide animation
let currentView = document.querySelector(".view.active");
let currentNav = document.querySelector(".nav-item.active");
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn === currentNav) return;
    const nextView = document.getElementById(`view-${btn.dataset.view}`);
    if (currentView) {
      currentView.classList.remove("active");
      currentView.classList.add("exit");
      setTimeout(() => currentView.classList.remove("exit"), 240);
    }
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    requestAnimationFrame(() => {
      nextView.classList.add("active");
      currentView = nextView;
      currentNav = btn;
    });
  });
});

function updatePreview(img) {
  if (img) {
    els.bgPreview.classList.add("has-image");
    els.bgPreview.innerHTML = `<img src="${img.replace(/"/g,'&quot;')}" alt="Background preview">`;
    els.bgPreview.title = "Click to view full size";
    els.bgPreview.onclick = () => window.open(img, "_blank");
  } else {
    els.bgPreview.classList.remove("has-image");
    els.bgPreview.style.backgroundImage = "";
    els.bgPreview.innerHTML = "<span>No image — upload or paste URL</span>";
    els.bgPreview.onclick = null;
  }
}

function updateVideoPreview(src) {
  if (!els.bgVideoPreview) return;
  if (src && src.length > 10) {
    els.bgVideoPreview.style.display = "block";
    const isVideo = src.startsWith("data:video") || src.endsWith(".mp4") || src.endsWith(".webm");
    if (isVideo) {
      els.bgVideoPreview.innerHTML = `<video src="${src.replace(/"/g,'&quot;')}" muted loop autoplay playsinline style="width:100%; max-height:150px; object-fit:cover; border-radius:6px;"></video>`;
    } else {
      els.bgVideoPreview.innerHTML = `<img src="${src.replace(/"/g,'&quot;')}" style="width:100%; max-height:150px; object-fit:contain; background:#0a0a0a; border-radius:6px;">`;
    }
    if (src.length < 300 && els.bgVideoUrl) els.bgVideoUrl.value = src;
  } else {
    els.bgVideoPreview.style.display = "none";
    els.bgVideoPreview.innerHTML = "";
  }
}
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (s) => {
    els.autoSkipAd.checked = s.autoSkipAd;
    els.hideShorts.checked = s.hideShorts;
    els.hidePlayables.checked = s.hidePlayables;
    els.customVolumeUI.checked = s.customVolumeUI;
    els.customBackgroundEnabled.checked = s.customBackgroundEnabled;
    els.bgOpacity.value = s.customBackgroundOpacity;
    els.bgBlur.value = s.customBackgroundBlur;
    els.bgOpacityVal.textContent = s.customBackgroundOpacity + "%";
    els.bgBlurVal.textContent = s.customBackgroundBlur + "px";
    if (els.bgFit) els.bgFit.value = s.customBackgroundFit || "cover";
    if (els.bgPosition) els.bgPosition.value = s.customBackgroundPosition || "center";
    els.bgControls.classList.toggle("disabled", !s.customBackgroundEnabled);
    els.skipNotice.checked = s.skipNotice;
    els.sponsorBlockEnabled.checked = s.sponsorBlockEnabled;
    if (els.modernPlayer) els.modernPlayer.checked = !!s.modernPlayer;
    if (els.minimalHeader) els.minimalHeader.checked = !!s.minimalHeader;
    if (els.focusHideMixes) els.focusHideMixes.checked = !!s.focusHideMixes;
    if (els.focusHideRecommended) els.focusHideRecommended.checked = !!s.focusHideRecommended;
    if (els.focusHideComments) els.focusHideComments.checked = !!s.focusHideComments;
    if (els.accentColor) els.accentColor.value = s.accentColor || "#f1f1f1";
    if (els.customCssEnabled) els.customCssEnabled.checked = !!s.customCssEnabled;
    if (els.perfAggressiveFeedCleaning) els.perfAggressiveFeedCleaning.checked = !!s.perfAggressiveFeedCleaning;
    if (els.perfSponsorBlock) els.perfSponsorBlock.checked = !!s.sponsorBlockEnabled;
    if (els.perfDisableBackgroundFx) els.perfDisableBackgroundFx.checked = !!s.perfDisableBackgroundFx;
    if (els.perfDisableAnimations) els.perfDisableAnimations.checked = !!s.perfDisableAnimations;
    if (els.perfReduceHistoryFrequency) els.perfReduceHistoryFrequency.checked = !!s.perfReduceHistoryFrequency;
    for (const inp of document.querySelectorAll("[data-cat]")) inp.checked = s.categories[inp.dataset.cat] ?? false;
    updateCats();
  });
  chrome.storage.local.get({ auraBackgroundImage: "", auraBackgroundVideo: "", auraCustomCss: "" }, ({ auraBackgroundImage, auraBackgroundVideo, auraCustomCss }) => {
    updatePreview(auraBackgroundImage);
    if (auraBackgroundImage && auraBackgroundImage.length < 300) els.bgUrl.value = auraBackgroundImage;
    updateVideoPreview(auraBackgroundVideo || "");
    if (auraBackgroundVideo && auraBackgroundVideo.length < 300 && els.bgVideoUrl) els.bgVideoUrl.value = auraBackgroundVideo;
    if (els.customCssText) els.customCssText.value = auraCustomCss || "";
  });
}
function loadStats() {
  chrome.storage.local.get({ stats: { adsSkipped: 0, sponsorsSkipped: 0, timeSaved: 0 } }, ({ stats }) => renderStats(stats));
}
function renderStats(stats) {
  if (!stats) return;
  els.statAds.textContent = stats.adsSkipped;
  els.statSponsors.textContent = stats.sponsorsSkipped;
  els.statTime.textContent = formatTime(stats.timeSaved);
  els.statAdsDetail.textContent = stats.adsSkipped;
  els.statSponsorsDetail.textContent = stats.sponsorsSkipped;
  els.statTimeDetail.textContent = formatTime(stats.timeSaved);
  if (els.statAdsDetail2) els.statAdsDetail2.textContent = stats.adsSkipped + " blocked";
  if (els.statSponsorsDetail2) els.statSponsorsDetail2.textContent = stats.sponsorsSkipped + " skipped";
}
function renderWatchTime(dailyWatchTime={}) {
  try {
    const now = new Date();
    const today = localDayKey(now);
    const todaySec = dailyWatchTime[today]||0;
    let weekSec=0, monthSec=0;
    const weekStart = new Date(now); weekStart.setDate(now.getDate()-now.getDay());
    const weekStartKey = localDayKey(weekStart);
    const monthStartKey = localDayKey(new Date(now.getFullYear(), now.getMonth(), 1));
    for (const [k,v] of Object.entries(dailyWatchTime)) {
      if (k >= weekStartKey) weekSec+=v;
      if (k >= monthStartKey) monthSec+=v;
    }
    if (els.watchToday) els.watchToday.textContent = formatTime(todaySec);
    if (els.watchWeek) els.watchWeek.textContent = formatTime(weekSec);
    if (els.watchMonth) els.watchMonth.textContent = formatTime(monthSec);
  } catch {}
}

// --- History with grouping, channel clickable, xx:xx/xx:xx + Continue watching ---
let cachedHistory = [];
let cachedResume = {};
let pendingNeedsRender = false;

function getProgress(e) {
  const pos = (e.position && e.duration) ? e.position : (cachedResume[e.videoId]?.position || 0);
  const dur = (e.position && e.duration) ? e.duration : (cachedResume[e.videoId]?.duration || 0);
  if (pos > 0 && dur > 0 && isFinite(pos) && isFinite(dur) && pos < dur) return { pos, dur, has: true };
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
}
function closeModal() {
  if (!els.modal) return;
  els.modal.classList.remove("open");
  els.modal.setAttribute("aria-hidden","true");
  if (pendingNeedsRender) { pendingNeedsRender = false; renderHistory(cachedHistory); }
}
function renderCurrentlyWatchingOptions() {
  const containers = [els.currentlyWatchingDash, els.currentlyWatchingHistory];
  if (!containers.some(Boolean)) return;
  const sorted = cachedHistory.slice().sort((a,b)=> b.lastWatched - a.lastWatched).filter(e=> Date.now() - e.lastWatched < 30*24*60*60*1000);
  if (!sorted.length) { containers.forEach(c=>{ if(c){ c.classList.remove("show"); c.style.display="none"; }}); return; }
  const withProgress = sorted.find(e=> getProgress(e).has);
  let candidate = withProgress;
  if (!candidate) {
    const recent = sorted[0];
    if (recent && (Date.now() - recent.lastWatched) < 2*60*60*1000) candidate = recent;
  }
  if (!candidate) { containers.forEach(c=>{ if(c){ c.classList.remove("show"); c.style.display="none"; }}); return; }
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
  const btnLabel = isContinue ? `Continue watching <i class="fa-solid fa-play" style="margin-left:6px;font-size:10px"></i>` : isRewatch ? `Watch again <i class="fa-solid fa-rotate-right" style="margin-left:6px;font-size:10px"></i>` : `<i class="fa-solid fa-play"></i> Watch`;
  const btnHref = isContinue ? continueUrl : watchUrl;
  const html = `<div class="currently-head"><span class="dot"></span> Currently watching <span style="margin-left:auto; font-size:10px; color:var(--muted)">${new Date(candidate.firstWatched || candidate.lastWatched).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>
    <div class="currently-main">
      <img class="currently-thumb" src="${escapeHtml(thumb)}" alt="" data-vid="${escapeHtml(vid)}">
      <div>
        <div class="currently-title" data-vid="${escapeHtml(vid)}" title="${escapeHtml(candidate.title)}">${escapeHtml(candidate.title)}</div>
        <div class="currently-channel"><a href="${escapeHtml(channelHref)}" target="_blank" rel="noopener" data-no-modal="1">${escapeHtml(channelName)}</a></div>
        <div class="currently-progress"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><span>${escapeHtml(timeDisplay)}</span></div>
        <div class="currently-actions"><a class="history-continue" href="${escapeHtml(btnHref)}" target="_blank" rel="noopener" data-no-modal="1">${btnLabel}</a><a class="btn-ghost" href="${escapeHtml(watchUrl)}" target="_blank" rel="noopener" data-no-modal="1" style="padding:7px 12px; font-size:11px; text-decoration:none; display:inline-flex; align-items:center; justify-content:center;"><i class="fa-solid fa-arrow-up-right-from-square" style="margin-right:6px"></i> Open</a></div>
      </div>
    </div>`;
  containers.forEach(c=>{
    if(!c) return;
    c.innerHTML = html;
    c.classList.add("show");
    c.style.display = "grid";
    c.querySelectorAll(".currently-thumb, .currently-title").forEach(el=> el.addEventListener("click", ()=> openModal(candidate)));
  });
}

function renderHistory(list=[]) {
  cachedHistory = Array.isArray(list) ? list.slice() : [];
  const renderList = (target, limit) => {
    if (!target) return;
    if (!cachedHistory.length) { target.innerHTML='<div class="hint">No videos yet — start watching.</div>'; return; }
    const cutoff = Date.now()-30*24*60*60*1000;
    let filtered = cachedHistory.filter(e=> e.lastWatched>=cutoff);
    const q = (els.historySearch?.value||"").toLowerCase().trim();
    if (q) filtered = filtered.filter(e=> (e.title+" "+(e.channel||"")).toLowerCase().includes(q));
    filtered = filtered.slice().sort((a,b)=> b.lastWatched - a.lastWatched);
    const toShowForLimit = limit ? filtered.slice(0,limit) : filtered;
    if (!toShowForLimit.length) { target.innerHTML='<div class="hint">No matches.</div>'; return; }

    // group by day
    const groups = new Map();
    for (const e of toShowForLimit) {
      const k = localDayKey(new Date(e.firstWatched || e.lastWatched));
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e);
    }
    const sortedKeys = [...groups.keys()].sort((a,b)=> b.localeCompare(a));
    let html="";
    for (const key of sortedKeys) {
      const items = groups.get(key);
      const dateLabel = formatDate(items[0].firstWatched || items[0].lastWatched);
      html += `<div class="history-group-head">${escapeHtml(dateLabel)} · ${items.length} video${items.length>1?"s":""} · ${escapeHtml(formatTime(items.reduce((a,e)=>a+(e.watchedSeconds||0),0)))}</div>`;
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
        const thumb = e.thumb || `https://i.ytimg.com/vi/${encodeURIComponent(vid)}/hqdefault.jpg`;
        const isContinue = prog.has && prog.pos > 8 && prog.pos < prog.dur - 10;
        const wasWatched = (e.watchedSeconds||0) > 0 || prog.has;
        const isRewatch = !isContinue && wasWatched;
        const btnClass = isContinue || isRewatch ? "history-continue" : "history-go";
        const btnLabel = isContinue ? `Continue watching <i class="fa-solid fa-play" style="margin-left:6px;font-size:10px"></i>` : isRewatch ? `Watch again <i class="fa-solid fa-rotate-right" style="margin-left:6px;font-size:10px"></i>` : `<i class="fa-solid fa-play"></i>`;
        const btnTitle = isContinue ? "Continue watching" : isRewatch ? "Watch again" : "Watch";
        const btnHref = isContinue ? continueUrl : watchUrl;
        html += `
        <div class="history-item" data-vid="${escapeHtml(vid)}">
          <div class="history-thumb-link"><img src="${escapeHtml(thumb)}" loading="lazy" data-fallback="1" alt=""></div>
          <div class="history-meta">
            <div class="history-title" title="${escapeHtml(e.title)}">${escapeHtml(e.title)}</div>
            <div class="history-channel"><a href="${escapeHtml(channelHref)}" target="_blank" rel="noopener" class="channel-link" data-no-modal="1">${escapeHtml(channelName)}</a></div>
            <div class="history-watched"><span><i class="${timeIcon}"></i> ${escapeHtml(timeDisplay)}</span><span class="hist-date">${new Date(e.firstWatched || e.lastWatched).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${new Date(e.firstWatched || e.lastWatched).toLocaleDateString()}</span></div>
          </div>
          <a class="${btnClass}" href="${escapeHtml(btnHref)}" target="_blank" rel="noopener" data-no-modal="1" title="${escapeHtml(btnTitle)}">${btnLabel}</a>
        </div>`;
      }
    }
    target.innerHTML = html;
    for (const img of target.querySelectorAll('img[data-fallback="1"]')) {
      img.addEventListener("error", () => { img.style.opacity=0.3; }, { once:true });
    }
  };
  renderList(els.historyList, 12);
  renderList(els.historyListFull, 0);
  renderCurrentlyWatchingOptions();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.stats) renderStats(changes.stats.newValue);
  if (area === "local" && changes.auraBackgroundImage) updatePreview(changes.auraBackgroundImage.newValue || "");
  if (area === "local" && changes.auraBackgroundVideo) updateVideoPreview(changes.auraBackgroundVideo.newValue || "");
  if (area === "local" && changes.auraCustomCss && els.customCssText && document.activeElement !== els.customCssText) els.customCssText.value = changes.auraCustomCss.newValue || "";
  if (area === "local" && changes.dailyWatchTime) renderWatchTime(changes.dailyWatchTime.newValue||{});
  if (area === "local" && changes.watchHistory) {
    if (els.modal && els.modal.classList.contains("open")) { cachedHistory = changes.watchHistory.newValue||[]; pendingNeedsRender = true; return; }
    renderHistory(changes.watchHistory.newValue||[]);
  }
  if (area === "local" && changes.resumePositions) {
    if (els.modal && els.modal.classList.contains("open")) { cachedResume = changes.resumePositions.newValue||{}; pendingNeedsRender = true; return; }
    cachedResume = changes.resumePositions.newValue||{}; renderHistory(cachedHistory);
  }
});

function updateCats() { els.categories.classList.toggle("disabled", !els.sponsorBlockEnabled.checked); }
function save() {
  const categories = {};
  for (const inp of document.querySelectorAll("[data-cat]")) categories[inp.dataset.cat] = inp.checked;
  let sponsorVal = true;
  if (els.perfSponsorBlock && document.activeElement === els.perfSponsorBlock) {
    sponsorVal = els.perfSponsorBlock.checked;
    if (els.sponsorBlockEnabled) els.sponsorBlockEnabled.checked = sponsorVal;
  } else if (els.sponsorBlockEnabled && document.activeElement === els.sponsorBlockEnabled) {
    sponsorVal = els.sponsorBlockEnabled.checked;
    if (els.perfSponsorBlock) els.perfSponsorBlock.checked = sponsorVal;
  } else if (els.perfSponsorBlock) {
    sponsorVal = els.perfSponsorBlock.checked;
    if (els.sponsorBlockEnabled) els.sponsorBlockEnabled.checked = sponsorVal;
  } else if (els.sponsorBlockEnabled) {
    sponsorVal = els.sponsorBlockEnabled.checked;
  }
  const data = {
    autoSkipAd: els.autoSkipAd.checked,
    hideShorts: els.hideShorts.checked,
    hidePlayables: els.hidePlayables.checked,
    customVolumeUI: els.customVolumeUI.checked,
    customBackgroundEnabled: els.customBackgroundEnabled.checked,
    customBackgroundOpacity: parseInt(els.bgOpacity.value,10),
    customBackgroundBlur: parseInt(els.bgBlur.value,10),
    customBackgroundFit: els.bgFit ? els.bgFit.value : "cover",
    customBackgroundPosition: els.bgPosition ? els.bgPosition.value : "center",
    modernPlayer: els.modernPlayer ? els.modernPlayer.checked : false,
    minimalHeader: els.minimalHeader ? els.minimalHeader.checked : false,
    focusHideMixes: els.focusHideMixes ? els.focusHideMixes.checked : false,
    focusHideRecommended: els.focusHideRecommended ? els.focusHideRecommended.checked : false,
    focusHideComments: els.focusHideComments ? els.focusHideComments.checked : false,
    accentColor: els.accentColor ? els.accentColor.value : "#f1f1f1",
    customCssEnabled: els.customCssEnabled ? els.customCssEnabled.checked : false,
    perfAggressiveFeedCleaning: els.perfAggressiveFeedCleaning ? els.perfAggressiveFeedCleaning.checked : false,
    perfDisableBackgroundFx: els.perfDisableBackgroundFx ? els.perfDisableBackgroundFx.checked : false,
    perfDisableAnimations: els.perfDisableAnimations ? els.perfDisableAnimations.checked : false,
    perfReduceHistoryFrequency: els.perfReduceHistoryFrequency ? els.perfReduceHistoryFrequency.checked : false,
    skipNotice: els.skipNotice.checked,
    sponsorBlockEnabled: sponsorVal,
    categories
  };
  els.bgControls.classList.toggle("disabled", !data.customBackgroundEnabled);
  chrome.storage.sync.set(data, () => toast("Saved ✓"));
  if (data.customCssEnabled && els.customCssText) {
    chrome.storage.local.set({ auraCustomCss: els.customCssText.value });
  }
}

[
  els.autoSkipAd, els.hideShorts, els.hidePlayables, els.customVolumeUI,
  els.customBackgroundEnabled, els.skipNotice, els.sponsorBlockEnabled,
  els.modernPlayer, els.minimalHeader, els.focusHideMixes, els.focusHideRecommended, els.focusHideComments, els.customCssEnabled
].forEach(el => el && el.addEventListener("change", save));
for (const inp of document.querySelectorAll("[data-cat]")) inp.addEventListener("change", save);
if (els.bgOpacity) els.bgOpacity.addEventListener("input", () => { els.bgOpacityVal.textContent = els.bgOpacity.value + "%"; save(); });
if (els.bgBlur) els.bgBlur.addEventListener("input", () => { els.bgBlurVal.textContent = els.bgBlur.value + "px"; save(); });
if (els.bgFit) els.bgFit.addEventListener("change", save);
if (els.bgPosition) els.bgPosition.addEventListener("change", save);
if (els.accentColor) els.accentColor.addEventListener("input", save);
if (els.accentColor) els.accentColor.addEventListener("change", save);
if (els.customCssText) {
  let cssTimer=null;
  els.customCssText.addEventListener("input", ()=>{
    clearTimeout(cssTimer);
    cssTimer=setTimeout(()=>{
      chrome.storage.local.set({ auraCustomCss: els.customCssText.value }, ()=> toast("CSS saved ✓"));
      if (els.customCssEnabled && els.customCssEnabled.checked) chrome.storage.local.set({ auraCustomCss: els.customCssText.value });
    }, 600);
  });
}

if (els.bgFile) els.bgFile.addEventListener("change", () => {
  const file = els.bgFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    chrome.storage.local.set({ auraBackgroundImage: reader.result }, () => {
      updatePreview(reader.result);
      toast("Background saved ✓");
    });
  };
  reader.readAsDataURL(file);
});
if (els.bgUrlApply) els.bgUrlApply.addEventListener("click", () => {
  const url = els.bgUrl.value.trim();
  if (!url) return;
  chrome.storage.local.set({ auraBackgroundImage: url }, () => {
    updatePreview(url);
    toast("Background applied ✓");
  });
});
if (els.bgClear) els.bgClear.addEventListener("click", () => {
  chrome.storage.local.remove("auraBackgroundImage", () => {
    updatePreview("");
    els.bgUrl.value = "";
    toast("Background removed");
  });
});
document.querySelectorAll("#presetGallery .preset").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const val = btn.getAttribute("data-preset");
    if (!val) return;
    chrome.storage.local.set({ auraBackgroundImage: val }, ()=>{
      updatePreview(val);
      if (els.bgUrl) els.bgUrl.value = val.length < 300 ? val : "";
      toast("Preset applied ✓");
    });
  });
});
if (els.bgVideoFile) els.bgVideoFile.addEventListener("change", ()=>{
  const file = els.bgVideoFile.files[0];
  if (!file) return;
  if (file.size > 8*1024*1024) { toast("Video too large (max 8MB)"); return; }
  const reader = new FileReader();
  reader.onload = ()=>{
    chrome.storage.local.set({ auraBackgroundVideo: reader.result }, ()=>{
      updateVideoPreview(reader.result);
      toast("Video background saved ✓");
    });
  };
  reader.readAsDataURL(file);
});
if (els.bgVideoUrlApply) els.bgVideoUrlApply.addEventListener("click", ()=>{
  const url = els.bgVideoUrl.value.trim();
  if (!url) return;
  chrome.storage.local.set({ auraBackgroundVideo: url }, ()=>{
    updateVideoPreview(url);
    toast("Video background applied ✓");
  });
});
if (els.bgVideoClear) els.bgVideoClear.addEventListener("click", ()=>{
  chrome.storage.local.remove("auraBackgroundVideo", ()=>{
    updateVideoPreview("");
    if (els.bgVideoUrl) els.bgVideoUrl.value = "";
    toast("Video background removed");
  });
});
if (els.resetStats) els.resetStats.addEventListener("click", () => {
  chrome.storage.local.set({ stats: { adsSkipped: 0, sponsorsSkipped: 0, timeSaved: 0 } });
  toast("Stats reset");
});
if (els.resetAllSettings) els.resetAllSettings.addEventListener("click", () => {
  if (!confirm("Reset all settings to Standard? Clears background, accent, custom CSS and all appearance tweaks.")) return;
  chrome.storage.sync.clear(() => {
    chrome.storage.local.remove(["auraCustomCss","auraBackgroundImage","auraBackgroundVideo"], ()=>{
      try { document.documentElement.style.removeProperty("zoom"); document.documentElement.style.zoom=""; } catch {}
      toast("All reset to Standard ✓");
      setTimeout(()=> location.reload(), 700);
    });
  });
});

function loadWatch() {
  chrome.storage.local.get({ dailyWatchTime:{}, watchHistory:[], resumePositions:{} }, ({ dailyWatchTime, watchHistory, resumePositions })=> {
    cachedResume = resumePositions && typeof resumePositions==="object" ? resumePositions : {};
    renderWatchTime(dailyWatchTime||{});
    renderHistory(watchHistory||[]);
  });
}
function clearAllHistory(){
  if(!confirm("Clear all watch history and resume positions?")) return;
  chrome.storage.local.set({ watchHistory:[], dailyWatchTime:{}, resumePositions:{} }, ()=>{
    cachedHistory=[]; cachedResume={};
    renderHistory([]); renderWatchTime({});
    toast("History cleared");
  });
}
els.clearHistory?.addEventListener("click", clearAllHistory);
els.clearHistory2?.addEventListener("click", clearAllHistory);
els.historySearch?.addEventListener("input", ()=> renderHistory(cachedHistory));
function handleHistoryClick(e){
  if (e.target.closest("[data-no-modal]")) return;
  const item = e.target.closest(".history-item[data-vid]");
  if (!item) return;
  const vid = item.getAttribute("data-vid");
  const entry = cachedHistory.find(x=>x.videoId===vid);
  if (entry) openModal(entry);
}
els.historyList?.addEventListener("click", handleHistoryClick);
els.historyListFull?.addEventListener("click", handleHistoryClick);
els.modal?.querySelector(".modal-backdrop")?.addEventListener("click", closeModal);
els.modal?.querySelector(".modal-close")?.addEventListener("click", closeModal);
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && els.modal?.classList.contains("open")) closeModal(); });

loadSettings();
loadStats();
loadWatch();
