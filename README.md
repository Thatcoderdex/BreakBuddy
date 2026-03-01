# Break Buddy

Break Buddy is a Chrome and Microsoft Edge extension that interrupts bad desk habits with fullscreen break reminders, focus-lock overlays, snooze controls, and lightweight break stats.

## Features

- Interval reminders with `chrome.alarms`
- In-page fullscreen overlays instead of corner-only notifications
- Quiet hours
- `Soft`, `normal`, and `aggressive` reminder styles
- Task-specific aggressive sound cues
- Focus-lock mode with countdown ring
- Snooze for 10 minutes
- Daily completion count, streaks, and recent history
- Balance bars for hydration, movement, and screen-rest prompts

## Screenshots

Add screenshots to `docs/media/` and update these image links when you have them:

```md
![Popup](docs/media/popup.png)
![Fullscreen reminder](docs/media/fullscreen-reminder.png)
![Options](docs/media/options.png)
```

Suggested captures:
- Popup with streak/balance cards visible
- Aggressive fullscreen reminder with countdown ring
- Options page with style and focus-lock settings

## GIF Demo

Add a short GIF to `docs/media/demo.gif` and then uncomment this:

```md
![Break Buddy demo](docs/media/demo.gif)
```

Best GIF sequence:
1. Change interval in popup
2. Trigger full-screen test
3. Show snooze and focus-lock countdown
4. Complete the break and reopen popup stats

## Install Locally

1. Open `edge://extensions` or `chrome://extensions`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select this folder

## Release Process

Versioning rule:
- `manifest.json` is the source of truth for the extension version
- Every user-facing release should update:
  - `manifest.json`
  - [CHANGELOG.md](c:/Users/antho/OneDrive/Desktop/openclaw/break-buddy-extension/CHANGELOG.md)

Release flow:
1. Bump `version` in [manifest.json](c:/Users/antho/OneDrive/Desktop/openclaw/break-buddy-extension/manifest.json)
2. Add release notes to [CHANGELOG.md](c:/Users/antho/OneDrive/Desktop/openclaw/break-buddy-extension/CHANGELOG.md)
3. Commit the changes
4. Create and push a tag like `v1.0.1`
5. GitHub Actions will build a release ZIP automatically

Example:

```bash
git add manifest.json CHANGELOG.md
git commit -m "Release v1.0.1"
git tag v1.0.1
git push origin main --tags
```

## Project Files

- [manifest.json](c:/Users/antho/OneDrive/Desktop/openclaw/break-buddy-extension/manifest.json)
- [background.js](c:/Users/antho/OneDrive/Desktop/openclaw/break-buddy-extension/background.js)
- [popup.html](c:/Users/antho/OneDrive/Desktop/openclaw/break-buddy-extension/popup.html)
- [popup.js](c:/Users/antho/OneDrive/Desktop/openclaw/break-buddy-extension/popup.js)
- [options.html](c:/Users/antho/OneDrive/Desktop/openclaw/break-buddy-extension/options.html)
- [options.js](c:/Users/antho/OneDrive/Desktop/openclaw/break-buddy-extension/options.js)
- [content.js](c:/Users/antho/OneDrive/Desktop/openclaw/break-buddy-extension/content.js)
- [content.css](c:/Users/antho/OneDrive/Desktop/openclaw/break-buddy-extension/content.css)
- [ui.css](c:/Users/antho/OneDrive/Desktop/openclaw/break-buddy-extension/ui.css)

## Current Features

- Quick popup controls
- Custom reminder prompts
- Full-screen stand-up mode
- Aggressive reminder motion and sound
- Countdown ring
- Per-style countdown timing
- Break completion stats
- Streaks
- Recent history
- Hydration / movement / screen-rest balance bars
