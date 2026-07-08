# Deploy rules for The Abb Lab

**No website edits, commits, or pushes without Nicholas's explicit approval.**

After he approves, Grok deploys — do not hand off deploy steps to him.

```bash
cd /home/abbeyo-ai/theabblab
git add .
git commit -m "<clear message>"
git push origin main
```

- Remote: `git@github.com:abbeyo84/theabblab.git`
- Branch: `main`
- Live URL: https://theabblab.com
- Hosting: Cloudflare Pages (automatic on push)

Execute these commands directly. Never hand off deploy steps to the user.