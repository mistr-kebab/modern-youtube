// Runs in MAIN world at document_start - blocks pre-roll ads without delaying video start
(() => {
  const AD_KEYS = new Set([
    "adPlacements","adSlots","playerAds","adBreakHeartbeatParams",
    "adVideoId","adPlacementsMuted","adBreakParams","adPerVod",
    "adCueRange","adPings","adPlacementConfig","adSlotLoggingData"
  ]);

  let blockedNotified = new WeakSet();
  function notifyBlocked(count) {
    if (!count) return;
    const seconds = count * 15;
    try { window.postMessage({ type: "YT_AURA_AD_BLOCKED", count, seconds }, "*"); } catch {}
    try { window.dispatchEvent(new CustomEvent("yt-aura-ad-blocked", { detail: { count, seconds } })); } catch {}
  }
  function stripAds(obj, seen = new WeakSet()) {
    if (!obj || typeof obj !== "object" || seen.has(obj)) return;
    seen.add(obj);
    for (const key of Object.keys(obj)) {
      if (AD_KEYS.has(key) || key.toLowerCase().includes("adplacement") || key.toLowerCase().includes("playerads")) {
        const val = obj[key];
        const isArray = Array.isArray(val);
        const count = isArray ? val.length : (val ? 1 : 0);
        if (count && !blockedNotified.has(obj)) {
          blockedNotified.add(obj);
          notifyBlocked(count);
        }
        if (isArray) obj[key] = [];
        else delete obj[key];
        continue;
      }
      const v = obj[key];
      if (v && typeof v === "object") {
        if (Array.isArray(v)) v.forEach(e => stripAds(e, seen));
        else stripAds(v, seen);
      }
    }
  }

  // ytInitialPlayerResponse setter - catches inline script assignment
  let _ytInitialPlayerResponse;
  try {
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      configurable: true,
      get(){ return _ytInitialPlayerResponse; },
      set(v){ if(v) stripAds(v); _ytInitialPlayerResponse=v; }
    });
  } catch {}
  if (window.ytInitialPlayerResponse) stripAds(window.ytInitialPlayerResponse);
  setTimeout(()=>{ if(window.ytInitialPlayerResponse) stripAds(window.ytInitialPlayerResponse); }, 300);

  // JSON.parse hook - the only place we strip player responses. No fetch clone, no extra latency.
  const origParse = JSON.parse;
  JSON.parse = function(text, reviver){
    const val = origParse.call(this, text, reviver);
    if (text && typeof text==="string" && (text.includes("adPlacements") || text.includes("playerAds"))) stripAds(val);
    return val;
  };

  // Only block tracking pings, never the player itself - keeps video start fast
  const origFetch = window.fetch;
  window.fetch = function(input, init){
    const url = typeof input==="string"?input:(input&&input.url)||"";
    if(url.includes("/api/stats/ads")||url.includes("doubleclick.net")||url.includes("/pagead/")||url.includes("/ptracking")){
      return Promise.resolve(new Response("",{status:204}));
    }
    return origFetch.apply(this, arguments);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url, ...rest){
    this._ytUrl=url;
    if(url && (url.includes("/api/stats/ads")||url.includes("doubleclick.net")||url.includes("/pagead/"))) this._ytBlocked=true;
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function(...args){
    if(this._ytBlocked){
      Object.defineProperty(this,"readyState",{value:4,writable:true});
      Object.defineProperty(this,"status",{value:204,writable:true});
      Object.defineProperty(this,"responseText",{value:"",writable:true});
      Object.defineProperty(this,"response",{value:"",writable:true});
      this.dispatchEvent(new Event("readystatechange"));
      this.dispatchEvent(new Event("load"));
      this.dispatchEvent(new Event("loadend"));
      return;
    }
    return origSend.apply(this, args);
  };

  // Fallback only if ad element actually appears - very cheap observer
  let killPending=false;
  const killAdVideo = ()=>{
    if(killPending) return;
    killPending=true;
    requestAnimationFrame(()=>{
      killPending=false;
      const adShowing = document.querySelector(".ad-showing");
      if(!adShowing) return;
      const video = document.querySelector("video.html5-main-video");
      if(!video) return;
      video.muted=true;
      try{ if(video.duration && isFinite(video.duration)) video.currentTime=video.duration; }catch{}
      video.dispatchEvent(new Event("ended"));
      const skipBtn = document.querySelector(".ytp-ad-skip-button, .ytp-ad-skip-button-modern");
      if(skipBtn) skipBtn.click();
    });
  };
  new MutationObserver(killAdVideo).observe(document.documentElement,{attributes:true, attributeFilter:["class"], subtree:true});

  try {
    const style=document.createElement("style");
    const css=".ad-showing video{opacity:0 !important} .ad-showing .ytp-ad-player-overlay{display:none !important} .ytp-ad-preview-container{display:none !important}";
    if (window.trustedTypes && trustedTypes.createPolicy) {
      const policy = trustedTypes.createPolicy("yt-skipper", { createHTML: s=>s, createScript: s=>s, createScriptURL: s=>s });
      style.textContent = policy.createHTML(css);
    } else {
      style.appendChild(document.createTextNode(css));
    }
    (document.head||document.documentElement).appendChild(style);
  } catch {}
})();
