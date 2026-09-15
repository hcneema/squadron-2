# Deployment Guide

This app runs as a Node.js server that serves the PWA and proxies requests to `scheduler.squadron2.com`. To make it available to all Squadron 2 members, it needs to be hosted on a cloud platform with HTTPS.

---

## Option A — Render (Recommended)

Free tier available. Deploys directly from GitHub.

1. Go to [render.com](https://render.com) and sign up
2. Click **New → Web Service**
3. Connect your GitHub account and select the `squadron-2` repo
4. Configure:
   - **Name:** `squadron2-app`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node serve.js`
   - **Plan:** Free
5. Click **Deploy**
6. Render gives you a URL like `https://squadron2-app.onrender.com`

---

## Option B — Railway

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select the `squadron-2` repo
4. Railway auto-detects Node.js — set start command to `node serve.js`
5. Railway gives you a URL like `https://squadron2-app.up.railway.app`

---

## Option C — Fly.io

More control, still free for small apps.

```bash
npm install -g flyctl
fly auth login
fly launch        # follow prompts, select region closest to San Jose
fly deploy
```

---

## Custom Domain (Optional)

To use `app.squadron2.com` instead of the platform URL:

1. In your hosting platform, add a custom domain
2. Go to Squadron 2's DNS provider
3. Add a CNAME record:
   ```
   app.squadron2.com → squadron2-app.onrender.com
   ```
4. HTTPS certificate is issued automatically

---

## After Deployment

1. Update `serve.js` — remove `rejectUnauthorized: false` if the server doesn't need it (it was only needed on the AMD corporate network)
2. Share the URL with club members
3. Members open the URL in **Safari on iPhone** → tap Share ↑ → **Add to Home Screen**

---

## Things to Discuss with the Club

- [ ] Who owns and pays for the hosting (~$0–7/month)
- [ ] Whether to use a custom domain (`app.squadron2.com`)
- [ ] Get formal permission to proxy the Paperless141 portal
- [ ] Whether to restrict access (e.g. only members who know the URL, or add a pin)

---

## Local Development

```bash
git clone https://github.com/hcneema/squadron-2.git
cd squadron-2
npm install
node serve.js
```

Open `http://localhost:3000` — or `http://<your-local-ip>:3000` on your phone (same WiFi).
