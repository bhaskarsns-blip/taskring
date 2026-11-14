# TaskRing — to-do list, calendar & alarms

A single-page app that runs on phones and desktops in any modern browser. No build step, no server needed; all data stays in your browser's localStorage.

## Run it

- Easiest: open `index.html` in a browser.
- For install-as-app (PWA) + offline support: serve the folder, e.g. `python3 -m http.server 8000`, then visit http://localhost:8000. On Android Chrome use "Add to Home screen"; on iPhone Safari use Share → Add to Home Screen.

## Features

- **To-do list** — add/edit, priorities, due dates, filters, progress bar, clear completed.
- **Voice reminders** — tasks with the 🔊 mark are spoken aloud 5 minutes before their due time (browser speech synthesis).
- **Calendar** — month grid with dots plus a day agenda showing tasks, alarms and meetings together.
- **Alarms** — one-time or daily, General or Meeting type; rings with sound + banner + vibration + optional system notification while the app is open; snooze 5 minutes; a ♪ button tests an alarm in 5 seconds.

## Limits (web version)

- Alarms and voice reminders fire only while the app is open in a browser tab. True background alarms need a native app (React Native / Flutter) — happy to plan that version.
- Speech uses the device's built-in voices; the first tap enables audio on mobile browsers.

## Files

`index.html`, `styles.css`, `app.js`, `manifest.json`, `sw.js`, `icon.svg`

## Next steps you can ask for

- Recurring tasks, categories/tags, data export/import
- Push notifications via a small backend
- Native app version with background alarms
