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
- AI: Perplexity Sonar (sonar / sonar-pro / sonar-reasoning-pro), web-grounded by default. Called directly via httpx against `api.perplexity.ai/chat/completions`. MongoDB cache per (topic, context hash). *(Migrated from Claude Sonnet 4.5 in July 2026 — see Phase 3 below.)*
- CV PDF: reportlab + Perplexity AI enrichment (action-verb bullets, summary, optimization tips).
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

### Phase 3 (v1.2, Jul 2026)
- [x] Migrated ALL AI features from Claude (Anthropic) to Perplexity Sonar — no more `anthropic` SDK usage; new `call_perplexity()` httpx helper in server.py
- [x] News (`/api/world/news`) and Jakarta Live (`/api/world/jakarta-live`) now: (a) generate FULL narrative summaries (5-7+ sentences, not short blurbs), (b) return real, unbounded item counts instead of a hardcoded 6-8, (c) attach a real photo per item (Perplexity `return_images` when available, category-based Unsplash fallback otherwise) for an Instagram-style hero-image card layout
- [x] World.jsx redesigned: News & Jakarta tabs now render large hero-image cards with gradient overlay, category badge & title on the image (matching the existing Travel/Cities IG-style pattern), full-length body copy below
- [x] Render env var renamed `ANTHROPIC_API_KEY` → `PERPLEXITY_API_KEY` (code falls back to the old var name too, for safety during rollout)

### Phase 4 (v1.3, Jul 2026) — Perplexity reliability fix
- [x] **Root cause found & fixed**: `sonar-reasoning-pro` was used for all "deep" AI calls (stock insight, investment simulator, news, jakarta-live). Reasoning models spend part of `max_tokens` on hidden chain-of-thought before writing the final answer — in production this repeatedly produced EMPTY `message.content` once the token budget ran out mid-thought (surfaced to users as "AI error: Empty response from AI"), and was also much slower end-to-end. Switched `AI_DEEP_MODEL` to `sonar-pro` everywhere; no more reasoning models used in this app.
- [x] `call_perplexity()` is now self-healing: (a) auto-retries once with a different fallback model if the primary model returns empty content, (b) auto-retries without `return_images` if that param is rejected by the account tier (HTTP 4xx), (c) raises one clear final error only if both attempts truly fail.
- [x] Bumped `max_tokens` across the board (news/jakarta 6000-8000, stock/general insight 4000, investment simulator 3500) to give room for the longer narratives without truncation.
- [x] News prompt now explicitly guarantees minimum coverage per required category (Geopolitik Dunia, Geopolitik/Politik Indonesia, Teknologi, **Gadget** [new], Sepak Bola & Olahraga, Ekonomi & Pasar) with 15-20+ items total, still uncapped.
- [x] Added `_filter_upcoming()` — drops any Jakarta agenda item (AI-generated or the hardcoded static seed) whose date has clearly passed, so stale/expired events never show even before the AI refresh completes.
- [x] Frontend UI/UX pass on World.jsx: category filter chips for News, "Baca Selengkapnya" expand/collapse for long summaries (both News & Jakarta cards), last-updated timestamp + manual refresh button for News (Jakarta already had one).
- [x] Friendlier AI Insight error state (AIInsightButton.jsx): shows a plain-language message + a "Coba Lagi" retry button instead of a raw backend error string.
- [x] Verified with a full clean `npm run build` (Compiled successfully, 0 errors) plus targeted backend tests reproducing the exact empty-content bug and confirming the fallback recovers automatically.

### Phase 5 (v1.4, Jul 2026) — "News stays static" root cause fix
- [x] **Root cause**: the background refresh for news/jakarta was failing *silently* every time (error only went to logs), so the MongoDB `world_cache` was never populated and every request kept serving the static fallback + polling forever. Two culprits: (1) fragile JSON extraction — Perplexity Sonar peppers responses with citation markers like `[1]`/`[2]` and sometimes prose preamble, and the old `find("[")`-based parser grabbed a citation bracket instead of the real JSON array and threw; (2) `return_images`/`search_recency_filter` can be rejected (HTTP 4xx) by some Perplexity account tiers, and the retry didn't strip *both* optional params.
- [x] Rewrote `extract_json_block()` to be bulletproof: strips ```fences``` and `<think>` tags, then bracket-balances every `[`/`{` candidate and returns the earliest *meaningful* container (dict, or list-containing-dicts), skipping scalar citation arrays and nested arrays. Unit-tested against 11 real-world Sonar output shapes.
- [x] `call_perplexity()` now progressively strips optional params on 4xx (images → recency → bare) and fails fast on 401/403 (auth). It also surfaces Perplexity's actual error body in the exception message.
- [x] `/world/news` and `/world/jakarta-live` now do a **bounded (25s) synchronous** fetch on first-ever load, so the first visitor gets real data instead of being stuck on static if background tasks fail; slow/failed sync still falls back to static + background poll.
- [x] New diagnostics: `GET /api/debug/news-raw` (runs the real news call synchronously, returns Perplexity's raw text + parse result + actual error), `POST /api/debug/refresh-world` (force-refresh news+jakarta, report item counts), `DELETE /api/debug/clear-world-cache` (wipe cache to force regen). `GET /api/debug/ai` now also reports whether the key looks like a `pplx-` key.

## Backlog
- [ ] Stock data live (Alpha Vantage / Yahoo Finance) — currently curated, AI insight is real
- [ ] Scraping ourworldindata real-time chart embeds
- [ ] Bookmark for cities, tech, freelance sites (currently only scholarship & company)
- [ ] Email digest weekly via Resend (deferred until user provides Resend key)
- [ ] Refactor server.py into modules (auth, content, ai, notes, bookmarks, cv, reminders) — getting long
- [ ] Verify Perplexity account tier supports `return_images` — if not, News/Jakarta will silently use the category-based Unsplash fallback images instead of real per-story photos

## User Persona
Profesional 40 tahun, mempersiapkan beasiswa S2 LN, eksplor karir global & freelance, tertarik investasi dalam & luar negeri, suka info dunia/teknologi/travel.
