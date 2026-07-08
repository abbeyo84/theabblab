# The Abb Lab — ABBEYO ENTERTAINMENT Website

This file is loaded automatically in every Grok session when working in this repo. Follow it for all site changes.

## Project identity

- **Brand:** The Abb Lab — an **ABBEYO ENTERTAINMENT** company
- **Live site:** https://theabblab.com
- **Strategic role:** Nicholas's **primary website** for generating income and creative projects — built to scale toward **mass wealth**
- **Clara (OpenClaw) reference:** `/home/abbeyo-ai/.openclaw/workspace/THEABBLAB.md`
- **GitHub repo:** https://github.com/abbeyo84/theabblab
- **Local path:** `/home/abbeyo-ai/theabblab`
- **Stack:** Static HTML/CSS/JS — no build step, no framework
- **Hosting:** Cloudflare Pages (auto-deploys from `main`)

## Deploy workflow (always do this after changes)

Grok must run these commands itself — never tell the user to push manually.

```bash
cd /home/abbeyo-ai/theabblab
git add .
git commit -m "Short description of the change"
git push origin main
```

- Push target: `git@github.com:abbeyo84/theabblab.git`
- Branch: `main`
- Deploy time: ~30–60 seconds after push
- Verify live: `curl -sI https://theabblab.com | head -3`

When editing cached assets (JS/CSS), bump the `?v=` query string in HTML (e.g. `radio.js?v=7` → `v=8`).

## File structure

```
theabblab/
├── index.html          # Main single-page site
├── style.css           # Main site styles (dark theme, lab/studio vibe)
├── script.js           # Nav, shop filters, scroll reveals, forms
├── AGENTS.md           # This file — project rules for Grok
├── audio/
│   ├── abbeyo-radio.html   # ABBEYO RADIO web player
│   ├── radio.js            # Player logic (STATIONS map, event delegation)
│   └── radio.css           # Player styles
└── assets/
    ├── logo/logo.svg
    ├── favicon/favicon.svg
    └── images/
```

## Site sections (index.html)

| Section | ID | Status |
|---------|-----|--------|
| Hero | `#hero` | Live |
| About | `#about` | Live |
| Shop | `#shop` | Live — filters: All, Bitcoin, Strange Realms, Abb Lab Core |
| Collections | `#collections` | Live |
| Library hub | `#library` | Live |
| Audio | `#audio` | Live — links to ABBEYO RADIO |
| Video | `#video` | Placeholder |
| Documents | `#documents` | Placeholder |
| Tools | `#tools` | Placeholder |
| Pictures | `#pictures` | Placeholder |
| AI | `#ai` | Placeholder |
| Releases | `#releases` | Live |
| Archive | `#archive` | Live |
| Subscribe | `#subscribe` | Live — form simulated in script.js |
| Contact | `#contact` | Live — form simulated in script.js |

## Content rules

- **No personal name** on the public site — brand is The Abb Lab / ABBEYO ENTERTAINMENT only
- **Emails:** `orders@theabblab.com`, `lab@theabblab.com`
- **Shop buttons** use `data-shop` attributes — Printful URLs still `#` placeholders
- **Design:** Dark theme, teal/violet accents, Instrument Serif + Outfit fonts, premium lab/studio aesthetic
- Match existing naming, spacing, and CSS variable patterns when adding code

## ABBEYO RADIO (`audio/`)

- **URL:** https://theabblab.com/audio/abbeyo-radio (redirects from `.html`)
- **5 stations** — presets keyed by `data-station-id`, not array index

| # | ID | Station | Stream URL |
|---|-----|---------|------------|
| 1 | ckue | CKUE Cool FM | `https://blackburn-ais.leanstream.co/CKUEF2-MP3?args=web_02` |
| 2 | u80s | SomaFM u80s | `https://ice1.somafm.com/u80s-128-mp3` |
| 3 | space | SomaFM Space Station | `https://ice1.somafm.com/spacestation-128-mp3` |
| 4 | kexp | KEXP 90.3 | `https://kexp.streamguys1.com/kexp160.aac` |
| 5 | secretagent | SomaFM Secret Agent | `https://ice1.somafm.com/secretagent-128-mp3` |

### Radio architecture (do not break)

- Station data in `STATIONS` map in `radio.js`, keyed by `data-station-id`
- Preset buttons are **static HTML** in `abbeyo-radio.html` with `data-station-id`, `data-url`, etc.
- Event delegation on `#radioPresets` container
- All DOM queries inside `init()` — never at script load time
- Playback: set `audio.src` → `play()` directly — **never** wait for `canplay` (breaks live streams)
- **No** `crossorigin="anonymous"` on the audio element
- `safePlay()` handles browsers where `audio.play()` doesn't return a Promise
- SomaFM stations poll metadata from `https://somafm.com/songs/{channel}.json`

## Known TODOs

- Connect Printful shop URLs (`data-shop` buttons)
- Contact form backend (currently simulated)
- Subscribe form backend (currently simulated)
- Real product images for merch cards
- Link Video, Documents, Tools, Pictures, AI sections as content is ready
- Optional: `_redirects` for clean URLs site-wide

## Grok ↔ Clara bridge

Cross-agent communication: `/home/abbeyo-ai/grok-clara-bridge/`

At session start, run `grok-clara-bridge/scripts/check-bridge.sh` and process pending `clara-to-grok/tasks/`.
After work, write responses to `grok-to-clara/responses/` and update `IMPROVEMENT-LOG.md`.

Clara queues strategy; Grok implements and deploys. See `~/.grok/rules/clara-bridge.md`.

## New session quick start

User may open a new chat and say e.g. "update the shop section" or "continue work on theabblab". Grok should:

1. Work in `/home/abbeyo-ai/theabblab`
2. Read this file and relevant source files
3. Make the requested changes
4. Commit and push to `main` unless the user says not to deploy