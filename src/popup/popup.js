const DEFAULT_SETTINGS = {
  autoSkipAd: true,
  sponsorBlockEnabled: true,
  hideShorts: true,
  hidePlayables: true,
  customVolumeUI: true,
  customBackgroundEnabled: false,
  customBackgroundOpacity: 35,
  customBackgroundBlur: 0,
  categories: {
    sponsor: true, intro: true, outro: true, interaction: true, selfpromo: true, music_offtopic: false
  },
  skipNotice: true
};

const els = {
  autoSkipAd: document.getElementById("autoSkipAd"),
  hideShorts: document.getElementById("hideShorts"),
  hidePlayables: document.getElementById("hidePlayables"),
  customVolumeUI: document.getElementById("customVolumeUI"),
  skipNotice: document.getElementById("skipNotice"),
  sponsorBlockEnabled: document.getElementById("sponsorBlockEnabled"),
  categories: document.getElementById("categories"),
  status: document.getElementById("status"),
  statAds: document.getElementById("statAds"),
  statSponsors: document.getElementById("statSponsors"),
  statTime: document.getElementById("statTime"),
  statAdsDetail: document.getElementById("statAdsDetail"),
  statSponsorsDetail: document.getElementById("statSponsorsDetail"),
  statTimeDetail: document.getElementById("statTimeDetail"),
  resetStats: document.getElementById("resetStats"),
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
  watchTodayP: document.getElementById("watchTodayP"),
  watchWeekP: document.getElementById("watchWeekP"),
  watchMonthP: document.getElementById("watchMonthP"),
};

function formatTime(s) {
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

// Tabs with indicator animation
const tabs = [...document.querySelectorAll(".tab")];
const indicator = document.querySelector(".tab-indicator");
function updateIndicator() {
  const active = document.querySelector(".tab.active");
  const idx = tabs.indexOf(active);
  indicator.style.transform = `translateX(${idx * 100}%)`;
}
tabs.forEach(btn => btn.addEventListener("click", () => {
  tabs.forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(`view-${btn.dataset.tab}`).classList.add("active");
  updateIndicator();
}));
updateIndicator();

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
    els.bgControls.classList.toggle("disabled", !s.customBackgroundEnabled);
    els.skipNotice.checked = s.skipNotice;
    els.sponsorBlockEnabled.checked = s.sponsorBlockEnabled;
    for (const inp of document.querySelectorAll("[data-cat]")) inp.checked = s.categories[inp.dataset.cat] ?? false;
    updateCategoryState();
  });
  chrome.storage.local.get({ auraBackgroundImage: "" }, ({ auraBackgroundImage }) => {
    updatePreview(auraBackgroundImage);
    if (auraBackgroundImage) els.bgUrl.value = auraBackgroundImage.length > 200 ? "" : auraBackgroundImage;
  });
}

function updatePreview(img) {
  if (img) {
    els.bgPreview.style.backgroundImage = `url("${img.replace(/"/g,'\\"')}")`;
    els.bgPreview.innerHTML = "";
  } else {
    els.bgPreview.style.backgroundImage = "";
    els.bgPreview.innerHTML = "<span>No image</span>";
  }
}

function loadStats() {
  chrome.storage.local.get({ stats: { adsSkipped: 0, sponsorsSkipped: 0, timeSaved: 0 } }, ({ stats }) => renderStats(stats));
}
function renderStats(stats) {
  els.statAds.textContent = stats.adsSkipped;
  els.statSponsors.textContent = stats.sponsorsSkipped;
  els.statTime.textContent = formatTime(stats.timeSaved);
  els.statAdsDetail.textContent = stats.adsSkipped;
  els.statSponsorsDetail.textContent = stats.sponsorsSkipped;
  els.statTimeDetail.textContent = formatTime(stats.timeSaved);
}
function localDayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function renderWatchTimeP(daily={}) {
  const now=new Date();
  const today = localDayKey(now);
  const todaySec = daily[today]||0;
  let weekSec=0, monthSec=0;
  const weekStart=new Date(now); weekStart.setDate(now.getDate()-now.getDay());
  const weekStartKey = localDayKey(weekStart);
  const monthStartKey = localDayKey(new Date(now.getFullYear(), now.getMonth(), 1));
  for(const [k,v] of Object.entries(daily)){ if(k>=weekStartKey) weekSec+=v; if(k>=monthStartKey) monthSec+=v; }
  if(els.watchTodayP) els.watchTodayP.textContent=formatTime(todaySec);
  if(els.watchWeekP) els.watchWeekP.textContent=formatTime(weekSec);
  if(els.watchMonthP) els.watchMonthP.textContent=formatTime(monthSec);
}
function loadWatchP() { chrome.storage.local.get({ dailyWatchTime:{} }, ({dailyWatchTime})=> renderWatchTimeP(dailyWatchTime)); }
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.stats) renderStats(changes.stats.newValue);
  if (area === "local" && changes.auraBackgroundImage) updatePreview(changes.auraBackgroundImage.newValue || "");
  if (area === "local" && changes.dailyWatchTime) renderWatchTimeP(changes.dailyWatchTime.newValue||{});
});

function updateCategoryState() { els.categories.classList.toggle("disabled", !els.sponsorBlockEnabled.checked); }

function save() {
  const categories = {};
  for (const inp of document.querySelectorAll("[data-cat]")) categories[inp.dataset.cat] = inp.checked;
  const data = {
    autoSkipAd: els.autoSkipAd.checked,
    hideShorts: els.hideShorts.checked,
    hidePlayables: els.hidePlayables.checked,
    customVolumeUI: els.customVolumeUI.checked,
    customBackgroundEnabled: els.customBackgroundEnabled.checked,
    customBackgroundOpacity: parseInt(els.bgOpacity.value,10),
    customBackgroundBlur: parseInt(els.bgBlur.value,10),
    skipNotice: els.skipNotice.checked,
    sponsorBlockEnabled: els.sponsorBlockEnabled.checked,
    categories
  };
  els.bgControls.classList.toggle("disabled", !data.customBackgroundEnabled);
  chrome.storage.sync.set(data, () => {
    els.status.textContent = "Saved ✓";
    setTimeout(() => els.status.textContent = "", 1500);
  });
}

els.autoSkipAd.addEventListener("change", save);
els.hideShorts.addEventListener("change", save);
els.hidePlayables.addEventListener("change", save);
els.customVolumeUI.addEventListener("change", save);
els.customBackgroundEnabled.addEventListener("change", save);
els.skipNotice.addEventListener("change", save);
els.sponsorBlockEnabled.addEventListener("change", () => { updateCategoryState(); save(); });
for (const inp of document.querySelectorAll("[data-cat]")) inp.addEventListener("change", save);

els.bgOpacity.addEventListener("input", () => { els.bgOpacityVal.textContent = els.bgOpacity.value + "%"; save(); });
els.bgBlur.addEventListener("input", () => { els.bgBlurVal.textContent = els.bgBlur.value + "px"; save(); });

els.bgFile.addEventListener("change", () => {
  const file = els.bgFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    chrome.storage.local.set({ auraBackgroundImage: dataUrl }, () => {
      updatePreview(dataUrl);
      els.status.textContent = "Background saved ✓";
      setTimeout(()=> els.status.textContent="",1500);
    });
  };
  reader.readAsDataURL(file);
});

els.bgUrlApply.addEventListener("click", () => {
  const url = els.bgUrl.value.trim();
  if (!url) return;
  chrome.storage.local.set({ auraBackgroundImage: url }, () => {
    updatePreview(url);
    els.status.textContent = "Background applied ✓";
    setTimeout(()=> els.status.textContent="",1500);
  });
});

els.bgClear.addEventListener("click", () => {
  chrome.storage.local.remove("auraBackgroundImage", () => {
    updatePreview("");
    els.bgUrl.value = "";
    els.status.textContent = "Background removed";
    setTimeout(()=> els.status.textContent="",1500);
  });
});

els.resetStats.addEventListener("click", () => {
  chrome.storage.local.set({ stats: { adsSkipped: 0, sponsorsSkipped: 0, timeSaved: 0 } });
  els.status.textContent = "Stats reset";
  setTimeout(() => els.status.textContent = "", 1500);
});

document.getElementById("openOptions")?.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
document.getElementById("openHistory")?.addEventListener("click", (e)=>{ e.preventDefault(); window.open(chrome.runtime.getURL("src/history/history.html"), "_blank"); });

loadSettings();
loadStats();
loadWatchP();
