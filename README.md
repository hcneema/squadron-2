# Squadron 2 Flying Club — Mobile PWA

A Progressive Web App (PWA) for [Squadron 2 Flying Club](https://www.squadron2.com) at Reid-Hillview Airport (RHV), San Jose, CA.

Gives club members a native mobile experience for the Paperless141© scheduling portal — installable on iPhone and Android with no App Store required.

---

## Features

- 📲 Installable on iPhone (Safari → Add to Home Screen) and Android
- 🔒 Session-aware reverse proxy — log in once, stay logged in
- 🗺️ Club Calendar — view all aircraft & instructor schedules
- 📅 Reserve / Modify — book or change a flight
- 🗓️ My Bookings — view your upcoming reservations
- 👤 My Account — profile and settings
- Smooth slide-in navigation with a native ‹ Back button
- Offline-capable shell via service worker

---

## How It Works

The scheduler portal (`scheduler.squadron2.com`) uses ASP.NET WebForms with session cookies that are restricted cross-origin. This app runs a lightweight Node.js reverse proxy that:

1. Forwards all browser requests to `scheduler.squadron2.com`
2. Stores session cookies server-side (keyed per browser session)
3. Rewrites HTML responses so all links stay within the proxy
4. Serves the PWA shell (home screen, navigation, styles)

The PWA loads the scheduler inside a full-screen iframe with a branded top bar and ‹ Home button — the user never leaves the app.

---

## Setup

### Requirements
- Node.js 18+

### Install
```bash
git clone https://github.com/hcneema/squadron2-app.git
cd squadron2-app
npm install
```

### Run
```bash
node serve.js
```

Open `http://localhost:3000` in your browser.

To access from your phone, open `http://<your-local-ip>:3000` in Safari (make sure phone and PC are on the same WiFi network).

### Install on iPhone
1. Open the network URL in **Safari**
2. Tap the **Share** button ↑
3. Tap **Add to Home Screen**
4. Tap **Add**

---

## Project Structure

```
squadron2-app/
├── serve.js          # Node.js server: static files + reverse proxy
├── package.json
├── pwa/
│   ├── index.html    # App shell
│   ├── styles.css    # Aviation-themed UI
│   ├── app.js        # Navigation and PWA install logic
│   ├── sw.js         # Service worker (offline support)
│   └── manifest.json # PWA manifest (icons, name, display mode)
└── inspect.js        # Dev tool: captures scheduler network traffic
```

---

## Deployment

For production use:
- Host on any Node.js platform (Railway, Render, Fly.io, VPS)
- HTTPS is required for the service worker to function on iOS in production
- Replace `rejectUnauthorized: false` in `serve.js` with a proper CA cert if needed

---

## Notes

- This app is built for Squadron 2 members only
- The scheduler is powered by [Paperless141©](https://www.paperless141.com)
- No member data is stored by this app — the proxy is stateless except for in-memory session cookies that clear on server restart
