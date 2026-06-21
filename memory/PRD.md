# One Smart — PRD

## Original Problem Statement
PWA bernama "One Smart" — login 6 digit passcode (default 991285, bisa diganti). Clean UI. 5 modul:
1. **Education** — Beasiswa S2 LN dengan filter usia, tips & AI insight lolos beasiswa, tips portfolio.
2. **Job** — Top 100 perusahaan dunia + AI insight salary & portfolio. Freelance sites bebas scam. Tren pekerjaan + AI advice. CV recommendation.
3. **Investment** — Saham ID & global (fundamental + teknikal), kurs, IHSG, emas, alternatif investasi, AI strategy.
4. **Our World** — Berita global, OurWorldInData stats, tech & gadget, kota terbaik, travelling ID, Jakarta today.
5. **Quick Action** — Notes/todo dengan numbering/bullet, reminder push notification (one-time/recurring).
6. **Config** — Ganti passcode, profile, language toggle ID/EN.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT auth (passcode-based).
- **AI**: Claude Sonnet 4.5 via Emergent LLM key (`emergentintegrations`). MongoDB cache per (topic, context hash).
- **Frontend**: React 19 + Tailwind + shadcn/ui + Phosphor icons.
- **PWA**: manifest + service worker + Web Push (VAPID).
- **Live data**: CoinGecko (BTC/ETH/Gold), exchangerate.host (USD/IDR).
- **Curated data**: scholarships, top companies, freelance sites, stocks, OWID insights, cities, tech, Jakarta agenda.

## Implementation Status (2026-02 v1)
- [x] Passcode login + JWT
- [x] Bottom nav (mobile) / sidebar (desktop)
- [x] Hub dashboard with live market strip
- [x] Education page (scholarships filtered by age, portfolio tips, AI insight)
- [x] Job page (companies + AI salary insight, freelance sites, trends + AI advice, CV recommendation)
- [x] Investment page (stocks ID + global, alternatives short/mid/long term, AI strategy)
- [x] World page (news, OWID, cities, tech, travel ID, Jakarta agenda)
- [x] Quick Action (notes with bullet/numbered/plain, items, reminders datetime, recurrence, push subscribe + test)
- [x] Config (profile name + DOB, change passcode, language toggle, logout)
- [x] Bilingual UI ID/EN
- [x] AI Insight modal (Claude Sonnet 4.5) with markdown rendering & MongoDB cache
- [x] PWA: manifest, service worker, web push subscription endpoint

## Backlog / Next Phase
- [ ] Push notification scheduler (cron worker) untuk reminder otomatis terjadwal — currently UI saves reminder_at + recurrence but no background dispatcher yet.
- [ ] Stock data live (Alpha Vantage / Yahoo Finance) — saat ini curated. Saat user beri API key dapat plug in.
- [ ] Scraping ourworldindata grafik real (currently curated insight summaries dengan deep link).
- [ ] CV PDF generator nyata (currently AI recommendation only).
- [ ] User personalization: bookmarks & favorites untuk beasiswa, perusahaan, kota.
- [ ] Dark mode toggle.

## User Persona
- **Primary**: Profesional 40 tahun, mempersiapkan beasiswa S2 LN, eksplor karir global & freelance, tertarik investasi dalam & luar negeri, suka info dunia/teknologi/travel.
