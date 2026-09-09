# Modern YouTube

YouTube, minus the parts you never asked for.

A Manifest V3 browser extension that strips pre-roll ads before playback,
skips SponsorBlock segments, hides feed clutter, and lets you re-skin YouTube.
Everything runs locally — no account, no telemetry, no background server.

## Features

- **Ad blocking** — ad placements are stripped from the player response before
  playback starts, backed by `declarativeNetRequest` rules
- **SponsorBlock** — skips sponsor, intro, outro, interaction, self-promo and
  music-offtopic segments (data from `sponsor.ajay.app`), marked in color on
  the timeline
- **Declutter** — hide Shorts shelf, Playables row and dead feed slots
- **Appearance** — custom background image or looping video across YouTube,
  modern rounded player, minimal header, modern volume and seek overlays
  (seek toast left/right, configurable jump, volume boost to 200%),
  custom CSS
- **Playback** - default quality, remembered playback speed, sleep timer
- **Channel whitelist** - keep ads on chosen channels; segments are still
  shown but never skipped (Ctrl+K → "Whitelist This Channel" on a video page)
- **Settings backup** - export/import all settings as JSON (options → About)
- **Focus mode** — hide mixes, recommended sidebar and comments
- **Stats & history** — locally stored counters (ads blocked, segments skipped,
  time saved) plus watch-time tracking and a browsable watch history

## Install (load unpacked)

1. Clone or download this repo.
2. Open `chrome://extensions` (works in Chrome, Edge and Brave).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder.
5. Open YouTube — open the popup or the full settings page to configure.

## Usage

- Click the toolbar icon for quick stats and core toggles.
- **Full settings** opens the options page (Dashboard, Blocking, Performance,
  Playback, Appearance, About). Changes apply instantly.
- Performance toggles let you trade effects and tracking frequency for speed
  on weaker machines.

## Privacy

Settings, stats, backgrounds and history live in `chrome.storage` on your own
machine. The only network request outside YouTube is one fetch per new video
to `sponsor.ajay.app` for SponsorBlock data (a 404 simply means no segments).
Disable it under Blocking if you want zero third-party requests.

## Project structure

```
manifest.json            MV3 manifest (permissions, DNR rules, icons)
assets/img/icon.png      extension + page icon/logo
src/content/             injected MAIN-world player patch + content script/CSS
src/popup/               toolbar popup (stats, settings, appearance)
src/options/             full settings page
src/history/             watch history page
src/rules/               declarativeNetRequest rules
```

## License

MIT — see [LICENSE](LICENSE).
