# Deploy TaskRing on GitHub Pages (free)

You need a GitHub account. Whole setup takes about 5 minutes.

## One-time setup (web browser, no git needed)

1. Go to https://github.com/new → repository name `taskring` → **Public** → Create repository. Skip README/license/gitignore.
2. In the new repo, click **Add file → Upload files**.
3. Drag **all** files from your `todo-alarm-app` folder: `index.html`, `styles.css`, `app.js`, `manifest.json`, `sw.js`, `icon.svg`, `README.md`, `DEPLOY.md`, `.nojekyll`.
4. Click **Commit changes**.
5. Go to **Settings → Pages** → Build and deployment → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → **Save**.
6. Wait 30–60 seconds. Your app is live at: `https://<your-username>.github.io/taskring/`

## On Android

Open that link in Chrome → menu (⋮) → **Add to Home screen**.

## Update the app later

Edit files on GitHub (or upload replacements) — Pages redeploys automatically. After editing `app.js` or `styles.css`, open `sw.js` and change `taskring-v1` to `taskring-v2` so phones pick up the new files.

## Optional: command line

```
cd todo-alarm-app
git init
git add .
git commit -m "TaskRing v1"
git branch -M main
git remote add origin https://github.com/<you>/taskring.git
git push -u origin main
```

## Troubleshooting

- **404 right after saving** — wait a minute and reload; first deploy takes a moment.
- **Blank page or old version** — in Chrome on the site: Settings → Site settings → Clear storage, then reload.
- **Alarms/voice** — they ring while the page is open (web limit), same as on desktop.
