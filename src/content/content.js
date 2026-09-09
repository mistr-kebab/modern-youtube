const DEFAULT_SETTINGS = {
  autoSkipAd: true,
  sponsorBlockEnabled: true,
  hidePlayables: true,
  hideShorts: true,
  customVolumeUI: true,
  modernPlayer: false,
  minimalHeader: false,
  focusHideMixes: false,
  focusHideRecommended: false,
  focusHideComments: false,
  commandPalette: true,
  customBackgroundEnabled: false,
  customBackgroundOpacity: 35,
  customBackgroundBlur: 0,
  customBackgroundFit: "cover",
  customBackgroundPosition: "center",
  accentColor: "#f1f1f1",
  customCssEnabled: false,
  perfAggressiveFeedCleaning: false,
  perfDisableBackgroundFx: false,
  perfDisableAnimations: false,
  perfReduceHistoryFrequency: false,
  categories: {
    sponsor: true,
    intro: true,
    outro: true,
    interaction: true,
    selfpromo: true,
    music_offtopic: false
  },
  skipNotice: true
};

let settings = { ...DEFAULT_SETTINGS, categories: { ...DEFAULT_SETTINGS.categories } };
let sponsorSegments = [];
let currentVideoId = null;

function applyCssToggles() {
  document.documentElement.classList.toggle("yt-hide-shorts", !!settings.hideShorts);
  document.documentElement.classList.toggle("yt-aura-bg", !!settings.customBackgroundEnabled);
  document.documentElement.classList.toggle("yt-modern-player", !!settings.modernPlayer);
  document.documentElement.classList.toggle("yt-minimal-header", !!settings.minimalHeader);
  document.documentElement.classList.toggle("yt-focus-hide-mixes", !!settings.focusHideMixes);
  document.documentElement.classList.toggle("yt-focus-hide-recommended", !!settings.focusHideRecommended);
  document.documentElement.classList.toggle("yt-focus-hide-comments", !!settings.focusHideComments);
}

try {
  if (isContextValid()) chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
    try {
      if (!isContextValid()) return;
      settings = { ...DEFAULT_SETTINGS, ...stored, categories: { ...DEFAULT_SETTINGS.categories, ...(stored.categories || {}) } };
      applyCssToggles();
      applyCustomBackground();
      applyAccentColor();
      applyCustomCss();
      applyPerfFlags();
    } catch {}
  });
} catch {}

chrome.storage.onChanged.addListener((changes, area) => {
  try {
    if (!isContextValid()) return;
    if (area === "sync") {
      for (const [key, { newValue }] of Object.entries(changes)) {
        if (key === "categories") settings.categories = { ...settings.categories, ...newValue };
        else settings[key] = newValue;
      }
      if ("hideShorts" in changes || "customBackgroundEnabled" in changes || "modernPlayer" in changes || "minimalHeader" in changes || "focusHideMixes" in changes || "focusHideRecommended" in changes || "focusHideComments" in changes) applyCssToggles();
      if ("customBackgroundEnabled" in changes || "customBackgroundOpacity" in changes || "customBackgroundBlur" in changes || "customBackgroundFit" in changes || "customBackgroundPosition" in changes || "perfDisableBackgroundFx" in changes) applyCustomBackground();
      if ("accentColor" in changes) applyAccentColor();
      if ("customCssEnabled" in changes) applyCustomCss();
      if ("perfDisableAnimations" in changes) applyPerfFlags();
      if ("sponsorBlockEnabled" in changes || "categories" in changes) {
        if (!settings.sponsorBlockEnabled) {
          sponsorSegments = [];
          clearSponsorSegmentsOverlay();
        } else {
          const vid = getVideoId();
          if (vid) {
            currentVideoId = null;
            sponsorSegments = [];
            clearSponsorSegmentsOverlay();
            loadForVideo(vid);
          } else {
            renderSponsorSegmentsOverlay();
          }
        }
      }
    }
    if (area === "local" && ("auraBackgroundImage" in changes || "auraBackgroundVideo" in changes)) applyCustomBackground();
    if (area === "local" && ("auraCustomCss" in changes || "customCssEnabled" in changes)) applyCustomCss();
  } catch {}
});

// --- Custom Background ---
function applyCustomBackground() {
  try {
    if (!isContextValid()) return;
    let bg = document.getElementById("yt-aura-bg");
    let bgVideo = document.getElementById("yt-aura-bg-video");
    let overlay = document.getElementById("yt-aura-overlay");
    if (!settings.customBackgroundEnabled) {
      if (bg) bg.remove();
      if (bgVideo) bgVideo.remove();
      if (overlay) overlay.remove();
      document.documentElement.style.removeProperty("--aura-bg-opacity");
      document.documentElement.style.removeProperty("--aura-bg-blur");
      return;
    }
    chrome.storage.local.get({ auraBackgroundImage: "", auraBackgroundVideo: "" }, ({ auraBackgroundImage, auraBackgroundVideo }) => {
      try {
        if (!isContextValid()) return;
        const isVideo = !!(auraBackgroundVideo && auraBackgroundVideo.length > 10);
        let src = isVideo ? auraBackgroundVideo : auraBackgroundImage;
        if (settings.perfDisableBackgroundFx && isVideo) {
          // performance: ignore video, fallback to image if exists
          if (auraBackgroundImage && auraBackgroundImage.length > 10) src = auraBackgroundImage;
          else { if (bg) bg.remove(); if (bgVideo) bgVideo.remove(); return; }
        }
        if (!src) return;
        if (!overlay) {
          overlay = document.createElement("div");
          overlay.id = "yt-aura-overlay";
          (document.body || document.documentElement).appendChild(overlay);
        }
        let opacity = Math.max(0, Math.min(100, settings.customBackgroundOpacity ?? 35)) / 100;
        let blur = Math.max(0, Math.min(20, settings.customBackgroundBlur ?? 0));
        const fit = settings.customBackgroundFit || "cover";
        const pos = settings.customBackgroundPosition || "center";
        if (settings.perfDisableBackgroundFx) { blur = 0; }
        const effectiveIsVideo = isVideo && !settings.perfDisableBackgroundFx;
        if (effectiveIsVideo) {
          if (bg) { bg.remove(); bg=null; }
          if (!bgVideo) {
            bgVideo = document.createElement("video");
            bgVideo.id = "yt-aura-bg-video";
            bgVideo.autoplay = true; bgVideo.loop = true; bgVideo.muted = true; bgVideo.playsInline = true;
            bgVideo.style.cssText = "position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;";
            (document.body || document.documentElement).appendChild(bgVideo);
          }
          if (bgVideo.src !== src) bgVideo.src = src;
          bgVideo.style.objectFit = fit === "contain" ? "contain" : fit === "tiled" ? "fill" : "cover";
          bgVideo.style.objectPosition = pos;
          bgVideo.style.opacity = String(opacity);
          bgVideo.style.filter = blur ? `blur(${blur}px)` : "none";
          bgVideo.style.transform = blur ? "scale(1.04)" : "none";
          if (fit === "tiled") { bgVideo.style.objectFit = "fill"; }
        } else {
          if (bgVideo) { bgVideo.remove(); bgVideo=null; }
          if (!bg) {
            bg = document.createElement("div");
            bg.id = "yt-aura-bg";
            (document.body || document.documentElement).appendChild(bg);
          }
          const isGradient = src.startsWith("linear-gradient") || src.startsWith("radial-gradient");
          if (isGradient) {
            bg.style.backgroundImage = src;
            bg.style.backgroundSize = "cover";
            bg.style.backgroundRepeat = "no-repeat";
          } else {
            bg.style.backgroundImage = `url("${src.replace(/"/g, '\\"')}")`;
            if (fit === "tiled") { bg.style.backgroundSize = "auto"; bg.style.backgroundRepeat = "repeat"; }
            else if (fit === "contain") { bg.style.backgroundSize = "contain"; bg.style.backgroundRepeat = "no-repeat"; }
            else { bg.style.backgroundSize = "cover"; bg.style.backgroundRepeat = "no-repeat"; }
          }
          bg.style.backgroundPosition = pos;
          bg.style.opacity = String(opacity);
          bg.style.filter = blur ? `blur(${blur}px)` : "none";
          bg.style.transform = blur ? "scale(1.04)" : "none";
        }
      } catch {}
    });
  } catch {}
}

function initCustomBackground() {
  applyCustomBackground();
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      setTimeout(applyCustomBackground, 300);
    }
  }, 1500);
  window.addEventListener("yt-navigate-finish", () => setTimeout(applyCustomBackground, 300));
  window.addEventListener("popstate", () => setTimeout(applyCustomBackground, 300));
}
function applyAccentColor() {
  try {
    if (!isContextValid()) return;
    const c = settings.accentColor || "#f1f1f1";
    document.documentElement.style.setProperty("--aura-accent", c);
  } catch {}
}
function applyCustomCss() {
  try {
    if (!isContextValid()) return;
    let tag = document.getElementById("yt-aura-custom-css");
    if (!settings.customCssEnabled) { if (tag) tag.remove(); return; }
    chrome.storage.local.get({ auraCustomCss: "" }, ({ auraCustomCss }) => {
      try {
        if (!auraCustomCss || !auraCustomCss.trim()) { if (tag) tag.remove(); return; }
        if (!tag) { tag = document.createElement("style"); tag.id = "yt-aura-custom-css"; (document.head || document.documentElement).appendChild(tag); }
        tag.textContent = auraCustomCss;
      } catch {}
    });
  } catch {}
}
function applyPerfFlags() {
  try {
    if (!isContextValid()) return;
    document.documentElement.classList.toggle("perf-no-anim", !!settings.perfDisableAnimations);
    document.documentElement.classList.toggle("perf-reduce-motion", !!settings.perfDisableAnimations);
  } catch {}
}

function getVideoId() {
  const url = new URL(location.href);
  if (url.searchParams.has("v")) return url.searchParams.get("v");
  const match = location.pathname.match(/\/embed\/([^/?]+)/);
  return match ? match[1] : null;
}

function getVideo() {
  return document.querySelector("video.html5-main-video");
}

// --- Stats ---

function isContextValid() { try { return !!chrome.runtime?.id; } catch { return false; } }

function bumpStats({ ads = 0, sponsors = 0, seconds = 0 }) {
  try {
    if (!isContextValid()) return;
    chrome.storage.local.get({ stats: { adsSkipped: 0, sponsorsSkipped: 0, timeSaved: 0 } }, ({ stats }) => {
      try {
        if (!isContextValid()) return;
        stats.adsSkipped += ads;
        stats.sponsorsSkipped += sponsors;
        stats.timeSaved += seconds;
        chrome.storage.local.set({ stats });
      } catch {}
    });
  } catch {}
}

// --- Watch History & Watch Time ---
let watchTicker = null;
let lastVideoIdForHistory = null;
let currentHistoryEntry = null;

function getTodayKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getVideoMeta() {
  const videoId = getVideoId();
  if (!videoId) return null;
  const titleEl = document.querySelector("ytd-watch-metadata h1 yt-formatted-string, h1.ytd-watch-metadata yt-formatted-string, #title h1");
  let channel = "";
  let channelUrl = "";
  const channelAnchor = document.querySelector("ytd-channel-name a, #channel-name a, ytd-video-owner-renderer a[href*='/channel/'], ytd-video-owner-renderer a[href*='/@'], ytd-watch-metadata #channel-name a, a.yt-formatted-string[href*='/@'], a.yt-formatted-string[href*='/channel/']");
  const channelTextEl = document.querySelector("ytd-channel-name #text, #channel-name #text, ytd-watch-metadata #channel-name a, ytd-video-owner-renderer #text");
  if (channelAnchor) {
    const href = channelAnchor.getAttribute("href");
    if (href) {
      try { channelUrl = new URL(href, location.origin).href; } catch { channelUrl = href; }
    }
    channel = (channelAnchor.textContent || "").trim();
    if (!channel && channelTextEl) channel = channelTextEl.textContent.trim();
  } else if (channelTextEl) {
    channel = channelTextEl.textContent.trim();
    const maybeLink = channelTextEl.closest("a");
    if (maybeLink && maybeLink.getAttribute("href")) {
      try { channelUrl = new URL(maybeLink.getAttribute("href"), location.origin).href; } catch { channelUrl = maybeLink.getAttribute("href"); }
    }
  }
  if (!channel) {
    const fallback = document.querySelector("ytd-channel-name, #channel-name, ytd-video-owner-renderer");
    if (fallback) channel = (fallback.textContent || "").trim().split("\n")[0].trim();
  }
  const title = titleEl ? titleEl.textContent.trim() : document.title.replace(" - YouTube","").trim();
  return { videoId, title: title.slice(0,120), channel: channel.slice(0,80), channelUrl: (channelUrl||"").slice(0,200), thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
}

function addWatchTime(seconds) {
  if (seconds <= 0 || !isFinite(seconds)) return;
  try {
    if (!isContextValid()) return;
    const today = getTodayKey();
    chrome.storage.local.get({ dailyWatchTime: {} }, ({ dailyWatchTime }) => {
      try {
        if (!isContextValid()) return;
        dailyWatchTime = dailyWatchTime || {};
        dailyWatchTime[today] = (dailyWatchTime[today] || 0) + seconds;
        const keys = Object.keys(dailyWatchTime).sort();
        if (keys.length > 60) { for (let i=0;i<keys.length-60;i++) delete dailyWatchTime[keys[i]]; }
        chrome.storage.local.set({ dailyWatchTime });
      } catch {}
    });
  } catch {}
}

function pushHistoryEntry(meta, watchedAdd = 0) {
  if (!meta || !meta.videoId) return;
  try {
    if (!isContextValid()) return;
    const now = Date.now();
    // capture current video position/duration if available for immediate xx:xx/xx:xx display
    let pos = 0, dur = 0;
    try {
      const v = getVideo();
      if (v && isFinite(v.currentTime) && isFinite(v.duration) && v.duration > 0) { pos = v.currentTime; dur = v.duration; }
    } catch {}
    chrome.storage.local.get({ watchHistory: [] }, ({ watchHistory }) => {
      try {
        if (!isContextValid()) return;
        watchHistory = Array.isArray(watchHistory) ? watchHistory : [];
        let entry = watchHistory.find(e => e.videoId === meta.videoId);
        if (entry) {
          entry.watchedSeconds = (entry.watchedSeconds || 0) + watchedAdd;
          entry.lastWatched = now;
          entry.title = meta.title || entry.title;
          entry.channel = meta.channel || entry.channel;
          if (meta.channelUrl) entry.channelUrl = meta.channelUrl;
          if (pos > 0 && dur > 0) { entry.position = pos; entry.duration = dur; }
          watchHistory = [entry, ...watchHistory.filter(e=>e.videoId!==meta.videoId)];
        } else {
          entry = { videoId: meta.videoId, title: meta.title, channel: meta.channel, channelUrl: meta.channelUrl||"", thumb: meta.thumb, watchedSeconds: watchedAdd, firstWatched: now, lastWatched: now, position: pos||0, duration: dur||0 };
          watchHistory.unshift(entry);
        }
        if (watchHistory.length > 120) watchHistory = watchHistory.slice(0,120);
        chrome.storage.local.set({ watchHistory });
        currentHistoryEntry = entry;
      } catch {}
    });
  } catch {}
}

let resumeSaveTimer = null;
let cachedMeta = null;
let cachedMetaTime = 0;
function getCachedMeta(force=false) {
  const now = Date.now();
  const vid = getVideoId();
  if (!force && cachedMeta && cachedMeta.videoId === vid && (now - cachedMetaTime) < 4000) return cachedMeta;
  try {
    const m = getVideoMeta();
    if (m) { cachedMeta = m; cachedMetaTime = now; }
    return m;
  } catch { return cachedMeta; }
}
function saveResumePosition() {
  try {
    if (!isContextValid()) return;
    const video = getVideo();
    const vid = getVideoId();
    if (!video || !vid || video.ended || document.querySelector(".ad-showing")) return;
    const pos = video.currentTime;
    const dur = video.duration;
    if (!isFinite(pos) || !isFinite(dur) || dur < 30) return;
    if (pos < 8 || pos > dur - 15) return;
    const meta = getCachedMeta();
    chrome.storage.local.get({ resumePositions: {} }, ({ resumePositions }) => {
      try {
        if (!isContextValid()) return;
        resumePositions = resumePositions || {};
        resumePositions[vid] = { position: pos, duration: dur, updatedAt: Date.now(), title: meta?.title||"", channel: meta?.channel||"", channelUrl: meta?.channelUrl||"", thumb: meta?.thumb||"" };
        const keys = Object.keys(resumePositions);
        if (keys.length > 80) {
          const sorted = keys.sort((a,b)=> resumePositions[b].updatedAt - resumePositions[a].updatedAt);
          for (let i=80;i<sorted.length;i++) delete resumePositions[sorted[i]];
        }
        chrome.storage.local.set({ resumePositions });
      } catch {}
    });
  } catch {}
}

function formatResumeTime(s) {
  s = Math.floor(s);
  const m = Math.floor(s/60), sec = s%60;
  if (m >= 60) { const h=Math.floor(m/60); return `${h}:${String(m%60).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; }
  return `${m}:${String(sec).padStart(2,"0")}`;
}

function ensureResumeButton() {
  if (document.getElementById("yt-resume-btn")) return document.getElementById("yt-resume-btn");
  const btn = document.createElement("button");
  btn.id = "yt-resume-btn";
  btn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Continue</span>';
  btn.addEventListener("click", () => {
    const vid = getVideoId();
    if (!vid) return;
    try {
      if (!isContextValid()) return;
      chrome.storage.local.get({ resumePositions: {} }, ({ resumePositions }) => {
        const entry = resumePositions[vid];
        if (!entry) return;
        const video = getVideo();
        if (video) { video.currentTime = entry.position; video.play().catch(()=>{}); }
        hideResumeButton();
      });
    } catch {}
  });
  return btn;
}
function showResumeButton(position, duration) {
  const btn = ensureResumeButton();
  btn.querySelector("span").textContent = `Watch where you left off — ${formatResumeTime(position)} / ${formatResumeTime(duration)}`;
  btn.style.display = "flex";
  // attach to player
  const player = document.getElementById("player") || document.querySelector("#movie_player");
  if (player && !player.contains(btn)) {
    player.appendChild(btn);
  }
  clearTimeout(btn._hide);
  btn._hide = setTimeout(hideResumeButton, 9000);
}
function hideResumeButton() {
  const btn = document.getElementById("yt-resume-btn");
  if (btn) btn.style.display = "none";
}
function checkResume() {
  try {
    if (!isContextValid()) return;
    const vid = getVideoId();
    const video = getVideo();
    if (!vid || !video) return;
    // don't show if video is already playing beyond resume point
    if (video.currentTime > 10) { hideResumeButton(); return; }
    chrome.storage.local.get({ resumePositions: {} }, ({ resumePositions }) => {
      try {
        const entry = resumePositions[vid];
        if (!entry || !entry.position || !entry.duration) { hideResumeButton(); return; }
        if (entry.position < 10 || entry.position > entry.duration - 12) { hideResumeButton(); return; }
        // only show if saved within last 30 days
        if (Date.now() - entry.updatedAt > 30*24*60*60*1000) { hideResumeButton(); return; }
        showResumeButton(entry.position, entry.duration);
      } catch {}
    });
  } catch {}
}

let watchTimeAccum = 0;
let historyAccum = 0;
let accMeta = null;
let lastFlushTime = 0;
function flushWatchAccum() {
  try {
    if (!isContextValid()) return;
    // snapshot and reset synchronously to avoid race / double-count
    const timeToAdd = watchTimeAccum;
    const histToAdd = historyAccum;
    const metaSnap = accMeta ? { ...accMeta } : null;
    let posSnap = 0, durSnap = 0;
    try {
      const v = getVideo();
      if (v && isFinite(v.currentTime) && isFinite(v.duration) && v.duration > 0) { posSnap = v.currentTime; durSnap = v.duration; }
    } catch {}
    if (settings.perfReduceHistoryFrequency) {
      const now = Date.now();
      const enoughTime = (now - lastFlushTime) >= 7500;
      const enoughData = timeToAdd >= 6 || histToAdd >= 6;
      if (!enoughTime && !enoughData) return;
      lastFlushTime = now;
    } else {
      lastFlushTime = Date.now();
    }
    if (timeToAdd > 0) watchTimeAccum = 0;
    if (histToAdd > 0) historyAccum = 0;
    if (timeToAdd > 0) addWatchTime(timeToAdd);
    if (histToAdd > 0 && metaSnap) {
      chrome.storage.local.get({ watchHistory: [] }, ({ watchHistory }) => {
        try {
          if (!isContextValid()) return;
          watchHistory = Array.isArray(watchHistory) ? watchHistory : [];
          let e = watchHistory.find(x=>x.videoId===metaSnap.videoId);
          if (!e) {
            // create via pushHistoryEntry logic inline to avoid double async race
            const now = Date.now();
            e = { videoId: metaSnap.videoId, title: metaSnap.title, channel: metaSnap.channel, channelUrl: metaSnap.channelUrl||"", thumb: metaSnap.thumb, watchedSeconds: histToAdd, firstWatched: now, lastWatched: now, position: posSnap||0, duration: durSnap||0 };
            watchHistory.unshift(e);
            if (watchHistory.length > 120) watchHistory = watchHistory.slice(0,120);
            chrome.storage.local.set({ watchHistory });
            return;
          }
          e.watchedSeconds = (e.watchedSeconds||0)+histToAdd;
          e.lastWatched = Date.now();
          e.title = metaSnap.title || e.title;
          e.channel = metaSnap.channel || e.channel;
          if (metaSnap.channelUrl) e.channelUrl = metaSnap.channelUrl;
          if (posSnap > 0 && durSnap > 0) { e.position = posSnap; e.duration = durSnap; }
          // move to front so lastWatched order is visible in storage (sorting handles display but keeps storage tidy)
          const filtered = watchHistory.filter(x=>x.videoId!==metaSnap.videoId);
          watchHistory = [e, ...filtered];
          chrome.storage.local.set({ watchHistory });
        } catch {}
      });
    }
  } catch {}
}
setInterval(flushWatchAccum, 4000);

function startWatchTracking() {
  if (watchTicker) return;
  watchTicker = 1;
  let lastVideoTime = null;
  let lastVideoId = null;
  const onTimeUpdate = () => {
    try {
      if (!isContextValid()) return;
      const video = getVideo();
      const vid = getVideoId();
      if (!video || video.paused || video.ended || document.hidden || document.querySelector(".ad-showing")) {
        if (video && isFinite(video.currentTime)) lastVideoTime = video.currentTime;
        return;
      }
      if (vid !== lastVideoId) {
        lastVideoId = vid;
        lastVideoTime = video.currentTime;
        accMeta = getCachedMeta(true);
        return;
      }
      const cur = video.currentTime;
      if (!isFinite(cur) || !isFinite(lastVideoTime)) { lastVideoTime = cur; return; }
      const delta = cur - lastVideoTime;
      lastVideoTime = cur;
      if (delta <= 0.05 || delta > 4) return;
      watchTimeAccum += delta;
      historyAccum += delta;
      const metaInterval = settings.perfReduceHistoryFrequency ? 7000 : 3500;
      if (!accMeta || Date.now() - cachedMetaTime > metaInterval) accMeta = getCachedMeta();
      if (!resumeSaveTimer) {
        const delay = settings.perfReduceHistoryFrequency ? 6000 : 3000;
        resumeSaveTimer = setTimeout(() => { resumeSaveTimer=null; saveResumePosition(); }, delay);
      }
    } catch {}
  };
  const attach = () => {
    const v = getVideo();
    if (v && !v._ytWatchBound) {
      v._ytWatchBound = true;
      v.addEventListener("timeupdate", onTimeUpdate);
      v.addEventListener("seeking", () => { lastVideoTime = v.currentTime; });
      lastVideoTime = v.currentTime;
      lastVideoId = getVideoId();
      accMeta = getCachedMeta(true);
    }
  };
  attach();
  // only observe video container, not whole document – much cheaper
  const observeTarget = document.body || document.documentElement;
  new MutationObserver(attach).observe(observeTarget, { childList: true, subtree: true });
  document.addEventListener("visibilitychange", () => { if (document.hidden) flushWatchAccum(); });
  window.addEventListener("beforeunload", flushWatchAccum);
  window.addEventListener("pagehide", flushWatchAccum);
  setInterval(() => {
    const vid = getVideoId();
    if (vid && vid !== lastVideoIdForHistory) {
      lastVideoIdForHistory = vid;
      const meta = getCachedMeta(true);
      if (meta) pushHistoryEntry(meta, 0);
      setTimeout(checkResume, 800);
    }
  }, 2000);
  setTimeout(checkResume, 1200);
  const v = getVideo();
  if (v) v.addEventListener("loadedmetadata", checkResume);
}

// Count ads blocked before playback (from injected MAIN world) - supports postMessage and CustomEvent
window.addEventListener("message", (e) => {
  if (e.data && e.data.type === "YT_AURA_AD_BLOCKED") {
    const count = Math.max(1, e.data.count | 0);
    const seconds = e.data.seconds || count * 15;
    bumpStats({ ads: count, seconds });
  }
});
window.addEventListener("yt-aura-ad-blocked", (e) => {
  const count = Math.max(1, (e.detail?.count | 0) || 1);
  const seconds = e.detail?.seconds || count * 15;
  bumpStats({ ads: count, seconds });
});

// --- Ad Skipping ---

function trySkipAd() {
  if (!settings.autoSkipAd) return;
  const adShowing = document.querySelector(".ad-showing");
  // fast path: no ad -> just cleanup and exit (avoids querying skip buttons 4x every second)
  if (!adShowing) {
    const v = getVideo();
    if (v) {
      if (v.style.opacity === "0") v.style.opacity = "";
      if (v.playbackRate === 16) v.playbackRate = 1;
      v._ytAdCounted = false;
    }
    return;
  }
  const video = getVideo();
  const skipSelectors = [
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-skip-ad-button",
    ".videoAdUiSkipButton"
  ];
  for (const sel of skipSelectors) {
    const btn = document.querySelector(sel);
    if (btn && btn.offsetParent !== null) {
      const adDuration = video ? (video.duration || 30) : 30;
      const saved = Math.max(1, adDuration - (video ? video.currentTime : 0));
      btn.click();
      bumpStats({ ads: 1, seconds: Math.min(saved, 30) });
      return;
    }
  }

  // Pre-roll fallback: if ad slipped through the network block, kill it instantly without visible lag
  if (adShowing && video) {
    // Hide spinner/overlay instantly
    const overlay = document.querySelector(".ytp-ad-player-overlay, .ytp-ad-image-overlay");
    if (overlay) overlay.style.display = "none";
    if (video.duration && isFinite(video.duration) && video.duration > 0) {
      try {
        const saved = Math.max(0, video.duration - video.currentTime);
        // Jump to end and force ad to end without 16x stutter
        video.muted = true;
        video.currentTime = video.duration;
        // Fire ended to let YT advance to main video immediately
        video.dispatchEvent(new Event("ended"));
        if (saved > 1 && !video._ytAdCounted) {
          video._ytAdCounted = true;
          bumpStats({ ads: 1, seconds: Math.min(saved, 30) });
          setTimeout(() => { video._ytAdCounted = false; }, 3000);
        }
      } catch {}
      return;
    } else {
      // No duration yet (ad still loading) -> mute and hide until skippable
      video.muted = true;
      video.style.opacity = "0";
    }
  } else if (video && !adShowing) {
    if (video.style.opacity === "0") video.style.opacity = "";
    if (video.playbackRate === 16) video.playbackRate = 1;
    video._ytAdCounted = false;
  }
}

function isAdItem(item) {
  if (item.hasAttribute("is-ad")) return true;
  if (item.querySelector("ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-display-ad-renderer, ytd-promoted-sparkles-web-renderer, ytd-statement-banner-renderer, #in-feed-display-ad-renderer")) return true;
  // Ad badge (DE: "Anzeige", EN: "Ad" / "Sponsored")
  const badge = item.querySelector("[class*='badge'], ytd-badge-supported-renderer");
  if (badge && /^(Anzeige|Ad|Sponsored|Gesponsert)$/i.test(badge.textContent.trim())) return true;
  // Fallback: text content contains ad marker but no real video
  if (!item.querySelector("ytd-rich-grid-media, ytd-video-renderer, a#thumbnail")) {
    const t = (item.innerText || "").trim();
    if (t.length > 0 && t.length < 500 && !item.querySelector("ytd-rich-grid-media")) {
      // Has ad-like DOM but no video media -> likely ad placeholder
      if (item.querySelector("[href*='doubleclick'], [href*='googleadservices'], [href*='googlesyndication']")) return true;
    }
  }
  return false;
}

function cleanFeedAds() {
  if (location.pathname.startsWith("/watch") || location.pathname.startsWith("/embed")) return;
  if (document.hidden) return;
  try {
  const adSelectors = [
    "ytd-ad-slot-renderer",
    "ytd-in-feed-ad-layout-renderer",
    "ytd-display-ad-renderer",
    "#in-feed-display-ad-renderer",
    "ytd-statement-banner-renderer",
    "ytd-promoted-sparkles-web-renderer",
    "ytd-brand-video-singleton-renderer"
  ];
  let removedCount = 0;
  for (const sel of adSelectors) {
    const nodes = document.querySelectorAll(sel);
    if (!nodes.length) continue;
    for (const ad of nodes) {
      const container = ad.closest("ytd-rich-item-renderer, ytd-rich-section-renderer, ytd-reel-shelf-renderer, ytd-ad-slot-renderer");
      const target = container || ad;
      if (target && !target.classList.contains("yt-skipper-hidden")) {
        target.classList.add("yt-skipper-hidden");
        target.remove();
        removedCount++;
      }
    }
  }

  if (!settings.perfAggressiveFeedCleaning) {
    // light mode: skip expensive empty-slot sweep
  } else {
  // Only do expensive empty-slot sweep if we likely have dead spots – cheap check first
  const allItems = document.querySelectorAll("ytd-rich-item-renderer:not(.yt-skipper-hidden)");
  if (allItems.length) {
    for (const item of allItems) {
      if (isAdItem(item)) {
        item.classList.add("yt-skipper-hidden");
        item.remove();
        removedCount++;
        continue;
      }
      const hasMedia = item.querySelector("ytd-rich-grid-media, #content ytd-thumbnail, a#thumbnail, img[src*='ytimg']");
      const hasTitle = item.querySelector("#video-title, #video-title-link");
      if (hasMedia && hasTitle) continue;
      if (hasMedia || hasTitle) continue;
      // both missing -> potential empty placeholder – check without layout thrash first
      const hasAdAttr = item.hasAttribute("is-in-feed-ad");
      const isEmptyText = item.innerText.trim().length < 50;
      const isEmptyDom = item.childElementCount === 0 || item.innerHTML.trim() === "";
      // only call getBoundingClientRect when other checks indicate empty
      let isLargeEmpty = false;
      if ((hasAdAttr || isEmptyDom || isEmptyText) && !hasMedia && !hasTitle) {
        try {
          const rect = item.getBoundingClientRect();
          isLargeEmpty = rect.width > 100 && rect.height > 100;
        } catch { isLargeEmpty = false; }
        if (isLargeEmpty) {
          item.classList.add("yt-skipper-hidden");
          item.remove();
          removedCount++;
        }
      }
    }
  }
  }

  if (removedCount > 0) {
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("scroll"));
    const grid = document.querySelector("ytd-rich-grid-renderer");
    if (grid) try { grid.dispatchEvent(new Event("scroll")); } catch {}
  }

  if (settings.hideShorts) {
    const shortsShelves = document.querySelectorAll("ytd-reel-shelf-renderer, ytd-rich-shelf-renderer, ytd-rich-section-renderer");
    for (const shelf of shortsShelves) {
      if (shelf.classList.contains("yt-skipper-hidden")) continue;
      // quick pre-filter: must contain Shorts text
      const text = (shelf.innerText || "");
      if (!/Shorts/i.test(text.slice(0,300))) continue;
      const titleEl = shelf.querySelector("#title, #title-text, yt-formatted-string#title");
      const titleText = (titleEl ? titleEl.textContent : text.split("\n")[0] || "").trim();
      const isShorts = /^(Shorts|Short)$/i.test(titleText) || shelf.querySelector("ytd-reel-shelf-renderer, ytd-reel-item-renderer, a[href*='/shorts/']");
      if (isShorts && (text.includes("Shorts") || shelf.querySelector("ytd-reel-item-renderer"))) {
        const reelCount = shelf.querySelectorAll("ytd-reel-item-renderer, ytd-reel-video-renderer").length;
        const hasShortsHeader = /Shorts/i.test(text.slice(0, 200));
        if (reelCount > 0 || hasShortsHeader) {
          shelf.classList.add("yt-skipper-hidden");
          shelf.remove();
          removedCount++;
        }
      }
    }
    for (const el of document.querySelectorAll("ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer")) {
      if (el.innerText.trim() === "Shorts" && el.querySelector("a[href*='/shorts']")) {
        const container = el.closest("ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer");
        if (container) { container.style.display = "none"; }
      }
    }
  }

  } catch(e) { console.debug("[YT Skipper] cleanFeedAds error", e); }
  if (settings.hidePlayables) { try {
    const shelves = document.querySelectorAll("ytd-rich-section-renderer, ytd-rich-shelf-renderer, ytd-reel-shelf-renderer");
    for (const shelf of shelves) {
      if (shelf.classList.contains("yt-skipper-hidden")) continue;
      const text = shelf.innerText || "";
      if (!text.includes("Playables")) continue;
      if (/^\s*Playables\s*$/m.test(text) || (text.includes("Playables") && text.includes("Spielen"))) {
        const hasGames = shelf.querySelectorAll("ytd-rich-item-renderer").length >= 3 || text.includes("PEGI");
        if (hasGames || text.includes("Instant-Games")) {
          shelf.classList.add("yt-skipper-hidden");
          shelf.style.display = "none";
        }
      }
    }
    for (const el of document.querySelectorAll('[title="Playables"], [aria-label*="Playables"]')) {
      const container = el.closest("ytd-rich-section-renderer, ytd-rich-shelf-renderer");
      if (container && !container.classList.contains("yt-skipper-hidden")) {
        container.classList.add("yt-skipper-hidden");
        try { container.style.display = "none"; } catch {}
      }
    }
  } catch(e) { console.debug("[YT Skipper] playables error", e); }
  }
}

function bypassAdblockWall() {
  // Remove enforcement dialog that blocks playback when an ad blocker is detected
  const wallSelectors = [
    "ytd-enforcement-message-view-model",
    "#player-with-enforcement-message",
    "tp-yt-paper-dialog",
    "ytd-popup-container"
  ];
  for (const sel of document.querySelectorAll(wallSelectors.join(","))) {
    const isWall = sel.tagName.toLowerCase().includes("enforcement") ||
      sel.textContent.includes("Ad blockers") ||
      sel.textContent.includes("Werbeblocker") ||
      sel.textContent.includes("Allow YouTube ads") ||
      sel.querySelector("ytd-enforcement-message-view-model");
    if (isWall) {
      // If it's the dialog container, remove it entirely
      if (sel.tagName === "TP-YT-PAPER-DIALOG" || sel.tagName === "YTD-POPUP-CONTAINER") {
        if (sel.querySelector("ytd-enforcement-message-view-model")) sel.remove();
      } else if (sel.tagName === "YTD-ENFORCEMENT-MESSAGE-VIEW-MODEL") {
        const dialog = sel.closest("tp-yt-paper-dialog, ytd-popup-container");
        (dialog || sel).remove();
      }
    }
  }
  // Unlock background scroll / player
  if (document.querySelector("ytd-enforcement-message-view-model")) {
    document.documentElement.classList.add("yt-skipper-unblocked");
  }
  // Remove backdrop
  const backdrop = document.querySelector("tp-yt-iron-overlay-backdrop");
  if (backdrop && document.querySelector("ytd-enforcement-message-view-model")) backdrop.remove();
  // Unpause video if wall paused it
  const video = getVideo();
  if (video && video.paused && document.querySelector("ytd-enforcement-message-view-model")) {
    video.play().catch(() => {});
  }
  // Remove body scroll lock
  if (document.body && document.body.style.overflow === "hidden" && document.querySelector("tp-yt-paper-dialog")) {
    try { document.body.style.overflow = ""; } catch {}
  }
}

function observeAds() {
  let feedDebounce = null;
  let adCheckPending = false;
  const scheduleFeedClean = () => {
    if (location.pathname.startsWith("/watch") || location.pathname.startsWith("/embed") || document.hidden) return;
    clearTimeout(feedDebounce);
    feedDebounce = setTimeout(() => {
      const run = () => cleanFeedAds();
      if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 1500 });
      else run();
    }, 900);
  };
  const observer = new MutationObserver(() => {
    if (!adCheckPending) {
      adCheckPending = true;
      requestAnimationFrame(() => {
        adCheckPending = false;
        trySkipAd();
        if (document.querySelector("ytd-enforcement-message-view-model")) bypassAdblockWall();
      });
    }
    scheduleFeedClean();
  });
  // watch only childList on body (not attribute spamming on whole doc)
  try { observer.observe(document.body || document.documentElement, { childList: true, subtree: true }); } catch {}
  // separate lightweight observer for ad-showing class on player
  try {
    const playerTarget = document.getElementById("movie_player") || document.documentElement;
    new MutationObserver(() => { requestAnimationFrame(() => trySkipAd()); }).observe(playerTarget, { attributes: true, attributeFilter: ["class"] });
  } catch {}
  setInterval(() => { trySkipAd(); if (document.querySelector("ytd-enforcement-message-view-model")) bypassAdblockWall(); }, 2000);
  setInterval(() => {
    if (location.pathname.startsWith("/watch") || location.pathname.startsWith("/embed") || document.hidden) return;
    if ("requestIdleCallback" in window) requestIdleCallback(() => cleanFeedAds(), { timeout: 1500 }); else cleanFeedAds();
  }, 5000);
  // initial
  if ("requestIdleCallback" in window) requestIdleCallback(() => { cleanFeedAds(); bypassAdblockWall(); }, { timeout: 2000 });
  else { setTimeout(cleanFeedAds, 900); setTimeout(bypassAdblockWall, 600); }
}

// --- SponsorBlock ---

async function fetchSponsorSegments(videoId) {
  if (!settings.sponsorBlockEnabled) return [];
  const enabledCategories = Object.entries(settings.categories)
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (enabledCategories.length === 0 || !videoId) return [];

  const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${encodeURIComponent(videoId)}&categories=${encodeURIComponent(JSON.stringify(enabledCategories))}`;
  try {
    const res = await fetch(url);
    if (res.status === 404) return [];
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d) => ({ start: d.segment[0], end: d.segment[1], category: d.category })).sort((a, b) => a.start - b.start);
  } catch {
    return [];
  }
}

function showSkipNotice(category, duration) {
  if (!settings.skipNotice) return;
  let el = document.getElementById("yt-skipper-notice");
  if (!el) {
    el = document.createElement("div");
    el.id = "yt-skipper-notice";
    (document.body || document.documentElement).appendChild(el);
  }
  const labels = { sponsor: "Sponsor", intro: "Intro", outro: "Outro", interaction: "Interaction", selfpromo: "Self-promo", music_offtopic: "Music" };
  el.textContent = `${labels[category] || category} skipped (${duration.toFixed(0)}s)`;
  if (settings.perfDisableAnimations) {
    el.style.transition = "opacity 0.2s";
    el.style.opacity = "1";
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = "0"; }, 2500);
    return;
  }
  el.style.transition = "";
  el.style.opacity = "";
  el.classList.remove("hide");
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(el._t);
  clearTimeout(el._h);
  el._t = setTimeout(() => {
    el.classList.remove("show");
    el.classList.add("hide");
    el._h = setTimeout(() => el.classList.remove("hide"), 500);
  }, 2500);
}

const SEG_TIP_LABELS = { sponsor: "Sponsor", intro: "Intro", outro: "Outro", interaction: "Interaction", selfpromo: "Self-promo", music_offtopic: "Music Offtopic" };
const SEG_TIP_COLORS = { sponsor: "#ff0033", intro: "#00d8ff", outro: "#002aff", interaction: "#cc00ff", selfpromo: "#ffcc00", music_offtopic: "#ff6a00" };

function ensureSegmentTooltip(container) {
  if (!container || container._auraTipBound) return;
  container._auraTipBound = true;
  let tip = document.getElementById("yt-aura-seg-tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "yt-aura-seg-tip";
    tip.style.display = "none";
    (document.body || document.documentElement).appendChild(tip);
  }
  const hide = () => { tip.style.display = "none"; };
  container.addEventListener("mousemove", (e) => {
    try {
      const video = getVideo();
      const dur = video && isFinite(video.duration) ? video.duration : 0;
      if (!dur || !settings.sponsorBlockEnabled || !sponsorSegments.length) return hide();
      const rect = container.getBoundingClientRect();
      if (!rect.width) return hide();
      const frac = (e.clientX - rect.left) / rect.width;
      if (frac < 0 || frac > 1) return hide();
      const t = frac * dur;
      const seg = sponsorSegments.find((s) => settings.categories[s.category] && t >= s.start && t <= s.end);
      if (!seg) return hide();
      const cat = String(seg.category || "sponsor").replace(/[^a-z_]/g, "");
      const label = SEG_TIP_LABELS[cat] || cat;
      const color = SEG_TIP_COLORS[cat] || "#f1f1f1";
      tip.innerHTML = `<span class="dot" style="background:${color}"></span><strong>${label}</strong><span class="t">${formatResumeTime(seg.start)} – ${formatResumeTime(seg.end)} (${Math.round(seg.end - seg.start)}s)</span>`;
      tip.style.display = "flex";
      tip.style.left = Math.min(window.innerWidth - 100, Math.max(100, e.clientX)) + "px";
      tip.style.top = (rect.top - 12) + "px";
    } catch { hide(); }
  });
  container.addEventListener("mouseleave", hide);
}

function renderSponsorSegmentsOverlay() {
  try {
    const container = document.querySelector(".ytp-progress-bar-container");
    if (!container) {
      if (!renderSponsorSegmentsOverlay._r) {
        renderSponsorSegmentsOverlay._r = true;
        setTimeout(()=>{ renderSponsorSegmentsOverlay._r=false; if(sponsorSegments.length) renderSponsorSegmentsOverlay(); }, 700);
      }
      return;
    }
    ensureSegmentTooltip(container);
    let aura = document.getElementById("yt-aura-segments");
    if (!aura) {
      aura = document.createElement("div");
      aura.id = "yt-aura-segments";
      container.appendChild(aura);
    }
    const video = getVideo();
    const dur = video && isFinite(video.duration) ? video.duration : 0;
    if (!dur) {
      if (!renderSponsorSegmentsOverlay._d) {
        renderSponsorSegmentsOverlay._d = true;
        setTimeout(()=>{ renderSponsorSegmentsOverlay._d=false; if(sponsorSegments.length) renderSponsorSegmentsOverlay(); }, 600);
      }
      return;
    }
    if (!sponsorSegments.length || !settings.sponsorBlockEnabled) {
      aura.innerHTML = "";
      aura.style.display = "none";
      return;
    }
    const enabledCats = new Set(Object.entries(settings.categories).filter(([,v])=>v).map(([k])=>k));
    const visible = sponsorSegments.filter(s=> enabledCats.has(s.category));
    if (!visible.length) { aura.innerHTML=""; aura.style.display="none"; return; }
    aura.style.display = "block";
    aura.innerHTML = visible.map(seg => {
      const left = Math.max(0, Math.min(100, (seg.start / dur)*100));
      const width = Math.max(0.6, Math.min(100 - left, ((seg.end - seg.start)/dur)*100));
      const cat = String(seg.category||"sponsor").replace(/[^a-z_]/g,"");
      const labels = { sponsor:"Sponsor", intro:"Intro", outro:"Outro", interaction:"Interaction", selfpromo:"Self-promo", music_offtopic:"Music Offtopic" };
      const label = labels[cat] || cat;
      const startStr = formatResumeTime(seg.start);
      const endStr = formatResumeTime(seg.end);
      const durStr = Math.round(seg.end - seg.start) + "s";
      return `<div class="yt-aura-segment ${cat}" style="left:${left}%;width:${width}%" title="${label}: ${startStr} – ${endStr} (${durStr})"></div>`;
    }).join("");
  } catch {}
}
function clearSponsorSegmentsOverlay() {
  const el = document.getElementById("yt-aura-segments");
  if (el) { el.innerHTML=""; el.style.display="none"; }
}
function handleTimeUpdate() {
  const video = getVideo();
  if (!video || sponsorSegments.length === 0 || !settings.sponsorBlockEnabled) return;
  const t = video.currentTime;
  for (const seg of sponsorSegments) {
    if (!settings.categories[seg.category]) continue;
    if (t >= seg.start && t < seg.end - 0.3) {
      const saved = seg.end - seg.start;
      video.currentTime = seg.end;
      showSkipNotice(seg.category, saved);
      bumpStats({ sponsors: 1, seconds: saved });
      break;
    }
  }
}

async function loadForVideo(videoId) {
  if (!videoId || videoId === currentVideoId) return;
  currentVideoId = videoId;
  sponsorSegments = [];
  clearSponsorSegmentsOverlay();
  sponsorSegments = await fetchSponsorSegments(videoId);
  // render from start to end (Anfang bis Ende) as requested
  renderSponsorSegmentsOverlay();
  const v = getVideo();
  if (v) {
    const rerender = () => { if (sponsorSegments.length && settings.sponsorBlockEnabled) renderSponsorSegmentsOverlay(); };
    v.addEventListener("loadedmetadata", rerender);
    v.addEventListener("durationchange", rerender);
    v.addEventListener("canplay", rerender, { once: true });
    setTimeout(rerender, 600);
    setTimeout(rerender, 1500);
    setTimeout(rerender, 3000);
  }
}

function initSponsorBlock() {
  const video = getVideo();
  if (video) video.addEventListener("timeupdate", handleTimeUpdate);

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      loadForVideo(getVideoId());
      const v = getVideo();
      if (v) v.addEventListener("timeupdate", handleTimeUpdate);
    }
  }, 1000);

  loadForVideo(getVideoId());

  new MutationObserver(() => {
    const v = getVideo();
    if (v && !v._ytSkipperBound) {
      v._ytSkipperBound = true;
      v.addEventListener("timeupdate", handleTimeUpdate);
    }
  }).observe(document.body || document.documentElement, { childList: true, subtree: true });
  let segDebounce = null;
  let lastSegHash = "";
  const scheduleSegRender = () => {
    if (!sponsorSegments.length || !settings.sponsorBlockEnabled) return;
    const container = document.querySelector(".ytp-progress-bar-container");
    if (!container) return;
    const dur = getVideo()?.duration || 0;
    const hash = sponsorSegments.map(s=> s.start+":"+s.end+":"+s.category).join("|") + "|" + dur;
    if (hash === lastSegHash && document.getElementById("yt-aura-segments")?.childElementCount) return;
    clearTimeout(segDebounce);
    segDebounce = setTimeout(() => {
      lastSegHash = hash;
      renderSponsorSegmentsOverlay();
    }, 250);
  };
  try { new MutationObserver(scheduleSegRender).observe(document.body, { childList: true, subtree: true }); } catch {}
  setTimeout(scheduleSegRender, 900);
}

// --- Custom Volume UI ---
function ensureVolumeOverlay() {
  let el = document.getElementById("yt-custom-volume");
  if (el) return el;
  el = document.createElement("div");
  el.id = "yt-custom-volume";
  el.innerHTML = `
    <svg class="yt-vol-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
    <div class="yt-vol-track"><div class="yt-vol-fill"></div></div>
    <span class="yt-vol-value">100%</span>
  `;
  (document.body || document.documentElement).appendChild(el);
  return el;
}

function getVolumeIcon(volume, muted) {
  if (muted || volume === 0) return `<svg class="yt-vol-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
  if (volume < 0.33) return `<svg class="yt-vol-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
  if (volume < 0.66) return `<svg class="yt-vol-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a6 6 0 0 1 0 8.48" opacity="0.5"/></svg>`;
  return `<svg class="yt-vol-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
}

let volumeHideTimer = null;
function showVolumeOverlay(volume, muted) {
  if (!settings.customVolumeUI) return;
  const el = ensureVolumeOverlay();
  el.querySelector(".yt-vol-icon").outerHTML = getVolumeIcon(volume, muted);
  const pct = muted ? 0 : Math.round(volume * 100);
  el.querySelector(".yt-vol-fill").style.width = pct + "%";
  el.querySelector(".yt-vol-value").textContent = pct + "%";
  el.classList.toggle("muted", muted || pct === 0);
  el.classList.add("visible");
  clearTimeout(volumeHideTimer);
  volumeHideTimer = setTimeout(() => el.classList.remove("visible"), 1400);
}

function initCustomVolumeUI() {
  const isTyping = () => {
    const ae = document.activeElement;
    return ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);
  };
  let scrollLockUntil = 0;
  // Prevent overlay spam while scrolling (YouTube mutes on scroll in some contexts)
  window.addEventListener("wheel", () => { scrollLockUntil = Date.now() + 400; }, { passive: true });
  window.addEventListener("scroll", () => { scrollLockUntil = Date.now() + 400; }, { passive: true });
  document.addEventListener("keydown", (e) => {
    if (!settings.customVolumeUI) return;
    if (isTyping()) return;
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    const video = getVideo();
    if (!video) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    // Ignore if user is scrolling
    if (Date.now() < scrollLockUntil) return;
    e.preventDefault();
    e.stopPropagation();
    const step = 0.05;
    const delta = e.key === "ArrowUp" ? step : -step;
    let vol = video.volume + delta;
    vol = Math.max(0, Math.min(1, Math.round(vol * 20) / 20));
    video.volume = vol;
    if (vol > 0 && video.muted) video.muted = false;
    if (vol === 0) video.muted = true;
    const ytVolPanel = document.querySelector(".ytp-volume-panel");
    if (ytVolPanel) ytVolPanel.setAttribute("aria-valuenow", Math.round(vol * 100));
    showVolumeOverlay(vol, video.muted);
  }, true);

  // Hide native bezel via class
  const updateBezelClass = () => document.documentElement.classList.toggle("yt-custom-volume", !!settings.customVolumeUI);
  updateBezelClass();
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === "sync" && "customVolumeUI" in c) updateBezelClass();
  });
}

function injectFA(){ if(document.getElementById("yt-fa")) return; const l=document.createElement("link"); l.id="yt-fa"; l.rel="stylesheet"; l.href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"; (document.head||document.documentElement).appendChild(l); }
function initModernPlayer() {
  injectFA();
  if (!settings.modernPlayer) return;
  // Ambient
  const ensureAmbient = () => {
    const player = document.getElementById("player");
    if (!player || document.getElementById("yt-ambient")) return;
    const ambient = document.createElement("div");
    ambient.id = "yt-ambient";
    player.appendChild(ambient);
    const updateThumb = () => {
      const vid = getVideoId();
      if (vid) ambient.style.backgroundImage = `url("https://i.ytimg.com/vi/${vid}/hqdefault.jpg")`;
    };
    updateThumb();
    setInterval(() => { if (location.href !== ambient._lastHref) { ambient._lastHref = location.href; updateThumb(); } }, 800);
  };
  // Screenshot + Loop buttons
  const addPlayerButtons = () => {
    const controls = document.querySelector(".ytp-right-controls");
    if (!controls || document.getElementById("yt-screenshot-btn")) return;
    const shotBtn = document.createElement("button");
    shotBtn.id = "yt-screenshot-btn";
    shotBtn.className = "ytp-button yt-modern-btn";
    shotBtn.title = "Screenshot";
    shotBtn.innerHTML = '<i class="fa-solid fa-camera"></i>';
    shotBtn.onclick = () => {
      const v = getVideo();
      if (!v) return;
      const c = document.createElement("canvas");
      c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0);
      const a = document.createElement("a");
      a.href = c.toDataURL("image/png");
      a.download = `yt-${getVideoId()}-${Date.now()}.png`;
      a.click();
    };
    const loopBtn = document.createElement("button");
    loopBtn.id = "yt-loop-btn";
    loopBtn.className = "ytp-button yt-modern-btn";
    loopBtn.title = "Loop";
    loopBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
    const v = getVideo();
    if (v) loopBtn.classList.toggle("active", v.loop);
    loopBtn.onclick = () => {
      const v2 = getVideo();
      if (!v2) return;
      v2.loop = !v2.loop;
      loopBtn.classList.toggle("active", v2.loop);
    };
    controls.prepend(loopBtn);
    controls.prepend(shotBtn);
  };
  setInterval(() => { ensureAmbient(); addPlayerButtons(); }, 1200);
}

function initCommandPalette() {
  injectFA();
  if (!settings.commandPalette) return;
  let open = false;
  const cmds = [
    { id:"home", label:"Go Home", desc:"/", action:()=> location.href="/" },
    { id:"shorts-hide", label:"Toggle Shorts", desc:"Hide/show Shorts shelf", action:()=> chrome.storage.sync.set({ hideShorts: !settings.hideShorts }) },
    { id:"bg-toggle", label:"Toggle Background", desc:"Custom background", action:()=> chrome.storage.sync.set({ customBackgroundEnabled: !settings.customBackgroundEnabled }) },
    { id:"focus-comments", label:"Toggle Comments", desc:"Focus mode", action:()=> chrome.storage.sync.set({ focusHideComments: !settings.focusHideComments }) },
    { id:"clear-bg", label:"Clear Background", desc:"Remove image", action:()=> chrome.storage.local.remove("auraBackgroundImage") },
  ];
  const ensure = () => {
    let el = document.getElementById("yt-cmdk");
    if (el) return el;
    el = document.createElement("div");
    el.id = "yt-cmdk";
    el.innerHTML = `<div id="yt-cmdk-box"><input id="yt-cmdk-input" placeholder="Type a command..."><div id="yt-cmdk-list"></div></div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => { if (e.target === el) close(); });
    const input = el.querySelector("#yt-cmdk-input");
    input.addEventListener("input", () => render(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Enter") { const sel = el.querySelector(".yt-cmdk-item.selected"); if (sel) sel.click(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = [...el.querySelectorAll(".yt-cmdk-item")];
        const idx = items.findIndex(i=>i.classList.contains("selected"));
        const next = e.key==="ArrowDown" ? (idx+1)%items.length : (idx-1+items.length)%items.length;
        items.forEach(i=>i.classList.remove("selected"));
        if (items[next]) items[next].classList.add("selected");
      }
    });
    return el;
  };
  const render = (q="") => {
    const el = ensure();
    const list = el.querySelector("#yt-cmdk-list");
    const filtered = cmds.filter(c=> !q || c.label.toLowerCase().includes(q.toLowerCase()));
    list.innerHTML = filtered.map((c,i)=> `<div class="yt-cmdk-item ${i===0?"selected":""}" data-id="${c.id}"><span>${c.label}</span><small>${c.desc}</small></div>`).join("");
    list.querySelectorAll(".yt-cmdk-item").forEach(item=>{
      item.addEventListener("click", ()=>{
        const cmd = cmds.find(c=>c.id===item.dataset.id);
        if (cmd) cmd.action();
        close();
      });
    });
  };
  const openPalette = () => { const el = ensure(); el.classList.add("open"); el.querySelector("#yt-cmdk-input").value=""; render(""); setTimeout(()=> el.querySelector("#yt-cmdk-input").focus(), 30); open=true; };
  const close = () => { const el=document.getElementById("yt-cmdk"); if(el) el.classList.remove("open"); open=false; };
  document.addEventListener("keydown", (e)=>{
    if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="k") { e.preventDefault(); open?close():openPalette(); }
    if (e.key==="Escape" && open) close();
  });
}

// Boot
observeAds();
initCustomVolumeUI();
initCustomBackground();
applyAccentColor();
applyCustomCss();
applyPerfFlags();
initModernPlayer();
initCommandPalette();
startWatchTracking();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSponsorBlock);
} else {
  initSponsorBlock();
}
