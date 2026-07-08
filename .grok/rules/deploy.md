# Deploy rules for The Abb Lab

When making any change to this repo, Grok must deploy unless the user explicitly says not to.

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