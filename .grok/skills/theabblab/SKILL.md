---
name: theabblab
description: >
  Work on The Abb Lab website (theabblab.com) — ABBEYO ENTERTAINMENT commerce hub.
  Use when the user mentions theabblab, The Abb Lab, abb lab site, main website,
  theabblab.com, or wants to update/deploy the site. Covers editing HTML/CSS/JS,
  ABBEYO RADIO player, shop sections, and git push to Cloudflare Pages.
  Triggers on /theabblab.
---

# The Abb Lab Website Operator

## First steps

1. `cd /home/abbeyo-ai/theabblab`
2. Read `AGENTS.md` in the repo root for full project context
3. Read the specific files you need to change

## Deploy (required unless user says not to)

After completing changes, always commit and push:

```bash
cd /home/abbeyo-ai/theabblab
git add .
git commit -m "Describe the change"
git push origin main
```

- Repo: `git@github.com:abbeyo84/theabblab.git`
- Branch: `main`
- Cloudflare Pages auto-deploys in ~30–60s
- Run commands yourself — do not instruct the user to push

## Key paths

| What | Path |
|------|------|
| Main page | `index.html`, `style.css`, `script.js` |
| Radio player | `audio/abbeyo-radio.html`, `audio/radio.js`, `audio/radio.css` |
| Assets | `assets/logo/`, `assets/favicon/`, `assets/images/` |
| Project rules | `AGENTS.md` |

## Radio player guardrails

If touching `audio/radio.js` or `audio/abbeyo-radio.html`:

- Keep `STATIONS` map keyed by `data-station-id`
- Keep preset buttons as static HTML
- Use event delegation on `#radioPresets`
- DOM refs only inside `init()`
- Direct `audio.src` + `play()` — no `canplay` listener
- Bump `?v=` on script tag when changing radio.js

## Brand rules

- The Abb Lab / ABBEYO ENTERTAINMENT — no personal name on site
- Dark premium lab aesthetic — match existing CSS variables and fonts
- Emails: `orders@theabblab.com`, `lab@theabblab.com`