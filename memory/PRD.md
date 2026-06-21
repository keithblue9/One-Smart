# One Smart — PRD

## Original Problem Statement
PWA bernama "One Smart" — login 6 digit passcode (default 991285, bisa diganti). Clean UI. 5 modul:
1. Education — Beasiswa S2 LN dengan filter usia, tips & AI insight lolos beasiswa, tips portfolio.
2. Job — Top 100 perusahaan dunia + AI insight salary & portfolio. Freelance sites bebas scam. Tren pekerjaan + AI advice. CV recommendation.
3. Investment — Saham ID & global (fundamental + teknikal), kurs, IHSG, emas, alternatif investasi, AI strategy.
4. Our World — Berita global, OurWorldInData stats, tech & gadget, kota terbaik, travelling ID, Jakarta today.
5. Quick Action — Notes/todo dengan numbering/bullet, reminder push notification (one-time/recurring).
6. Config — Ganti passcode, profile, language toggle ID/EN.

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT auth (passcode-based). Background asyncio task for reminder dispatcher (polls every 30s).
- AI: Claude Sonnet 4.5 via Emergent LLM key (`emergentintegrations`). MongoDB cache per (topic, context hash).
- CV PDF: reportlab + Claude AI enrichment (action-verb bullets, summary, optimization tips).
- Frontend: React 19 + Tailwind + shadcn/ui + Phosphor icons. CSS-var-based dark mode toggle.
- PWA: manifest + service worker + Web Push (VAPID).
- Live data: CoinGecko (BTC/ETH/Gold), frankfurter.dev (USD/IDR) + open.er-api fallback.

## Implementation Status

### Phase 1 (v1.0, Feb 2026)
- [x] Passcode login + JWT
- [x] Bottom nav (mobile) / sidebar (desktop)
- [x] Hub dashboard with live market strip
- [x] Education (scholarships filtered by age, portfolio tips, AI insight)
- [x] Job (companies + AI salary insight, freelance sites, trends + AI advice)
- [x] Investment (stocks ID/global, alternatives short/mid/long term, AI strategy)
- [x] World (news, OWID, cities, tech, travel ID, Jakarta agenda)
- [x] Quick Action (notes bullet/numbered/plain, items, reminder datetime, recurrence, web push subscribe)
- [x] Config (profile, change passcode, language toggle, logout)
- [x] Bilingual ID/EN
- [x] AI Insight (Claude Sonnet 4.5) with markdown rendering & MongoDB cache
- [x] PWA manifest + service worker + VAPID

### Phase 2 (v1.1, Feb 2026)
- [x] Background reminder dispatcher (asyncio loop, every 30s, sends push, advances recurrence)
- [x] Dark mode toggle (sidebar + Config + mobile header) — persisted server & localStorage
- [x] Bookmarks for scholarships & companies (BookmarkButton component + /app/bookmarks page + Hub tile)
- [x] Real CV PDF generator (reportlab + Claude enrichment + download)

## Backlog
- [ ] Stock data live (Alpha Vantage / Yahoo Finance) — currently curated, AI insight is real
- [ ] Scraping ourworldindata real-time chart embeds
- [ ] Bookmark for cities, tech, freelance sites (currently only scholarship & company)
- [ ] Email digest weekly via Resend (deferred until user provides Resend key)
- [ ] Refactor server.py into modules (auth, content, ai, notes, bookmarks, cv, reminders) — getting long

## User Persona
Profesional 40 tahun, mempersiapkan beasiswa S2 LN, eksplor karir global & freelance, tertarik investasi dalam & luar negeri, suka info dunia/teknologi/travel.
