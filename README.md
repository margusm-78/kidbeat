# KidBeat – Ready-to-Deploy PWA (Vite + React)

This project is pre-configured to deploy on **Vercel** and install on iPad as a PWA.

## Local Setup
```bash
npm install
npm run dev
# Build
npm run build
npx serve -s dist   # optional preview
```

## Deploy to Vercel
- Push this folder to a public GitHub repo.
- Go to https://vercel.com/new and import the repo.
- Framework: **Vite** | Build: `npm run build` | Output: `dist`
- Vercel will use the included `vercel.json` for SPA routing.
- Open on iPad Safari → Share → **Add to Home Screen**.

## Features
- 4 tracks × 16 steps, tempo, swing, per-track volume
- Save/Load patterns via localStorage
- WAV export via OfflineAudioContext
- Works offline via Service Worker
