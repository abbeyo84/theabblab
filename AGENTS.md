# The Abb Lab — ABBEYO ENTERTAINMENT Website

This file is loaded automatically in every Grok session when working in this repo. Follow it for all site changes.

## Approval required (hard rule)

**Nicholas is the sole authority over theabblab.com.** No exceptions.

- **Do not** edit website files (`index.html`, `style.css`, `script.js`, `audio/*`, `assets/*`, etc.) without his **explicit approval**
- **Do not** commit or push to `main` without his **explicit approval**
- Propose changes first; wait for a clear yes (`approved`, `do it`, `yes`, `push it`, etc.) before touching files or deploying
- Reading, planning, and explaining are fine without approval
- This rule overrides any other deploy or "always push" instruction in this repo

## Project identity

- **Brand:** The Abb Lab — an **ABBEYO ENTERTAINMENT** company
- **Live site:** https://theabblab.com
- **Strategic role:** Nicholas's **primary website** for generating income and creative projects — built to scale toward **mass wealth**
- **Clara (OpenClaw) reference:** `/home/abbeyo-ai/.openclaw/workspace/THEABBLAB.md`
- **GitHub repo:** https://github.com/abbeyo84/theabblab
- **Local path:** `/home/abbeyo-ai/theabblab`
- **Stack:** Static HTML/CSS/JS — no build step, no framework
- **Hosting:** Cloudflare Pages (auto-deploys from `main`)

## Deploy workflow (only after Nicholas approves)

**Get explicit approval before any edit, commit, or push.**

After approval, Grok runs deploy — never tell Nicholas to push manually:

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
├── script.js           # Nav, scroll reveals, contact form
├── AGENTS.md           # This file — project rules for Grok
├── _redirects          # Cloudflare: /tools/pong → /games/pong
├── audio/
│   ├── abbeyo-radio.html   # ABBEYO RADIO web player
│   ├── radio.js            # Player logic (STATIONS map, event delegation)
│   └── radio.css           # Player styles
├── games/
│   ├── pong.html           # ABBEYO PONG
│   ├── pong.js
│   └── pong.css
└── assets/
    ├── logo/logo.svg
    ├── favicon/favicon.svg
    └── images/
```

## Site sections (index.html)

Keep the homepage simple until Nicholas asks to grow it. Shop and extra library sections are intentionally off the live page.

| Section | ID | Status |
|---------|-----|--------|
| Hero | `#hero` | Live — CTAs to Pong and Radio |
| Games | `#games` | Live — ABBEYO PONG |
| Radio | `#radio` | Live — ABBEYO RADIO |
| Contact | `#contact` | Live — form simulated in script.js |

## Content rules

- **No personal name** on the public site — brand is The Abb Lab / ABBEYO ENTERTAINMENT only
- **Emails:** `orders@theabblab.com`, `lab@theabblab.com`
- **Shop** is deferred — do not add merch/shop sections until Nicholas asks
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

- Shop (later) — Printful / merch when Nicholas is ready
- Contact form backend (currently simulated)
- Optional: extra library sections (video, documents, pictures, AI) when content exists

## Grok ↔ Clara bridge

Cross-agent communication: `/home/abbeyo-ai/grok-clara-bridge/`

At session start, run `grok-clara-bridge/scripts/check-bridge.sh` and process pending `clara-to-grok/tasks/`.
After work, write responses to `grok-to-clara/responses/` and update `IMPROVEMENT-LOG.md`.

Clara queues strategy; Grok implements **only after Nicholas approves**. See `~/.grok/rules/clara-bridge.md`.

## New session quick start

User may open a new chat and say e.g. "update the shop section" or "continue work on theabblab". Grok should:

1. Work in `/home/abbeyo-ai/theabblab`
2. Read this file and relevant source files
3. Propose changes — **do not edit files until Nicholas explicitly approves**
4. After approval only: make changes, then commit and push to `main`