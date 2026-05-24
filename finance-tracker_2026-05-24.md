# finance-tracker — Project Summary
**Date:** 2026-05-24

## What was done

### UI Rebuild
- Replaced the original UI with a professional, dense, English-language design system
- New CSS design tokens: `.card`, `.btn`, `.kpi-card`, `.data-table`, `.badge`, `.progress-fill`, `.toggle`, `.num`
- Base font size 15px; tabular number class for monetary values
- Pages rebuilt: Login, Dashboard, Transactions, Budgets, Settings

### Dashboard
- 4 KPI cards (balance, income, expenses, savings rate)
- Recharts bar chart — 6-month income vs. expense trend
- Category donut chart + budget status list
- Recent transactions data table

### Transactions Page
- Dense data table with search, type filter, column visibility picker
- NLP quick-add bar (Sparkles icon) — type natural language, auto-fills the add form

### Budgets Page
- Summary bar: Budgeted / Spent / Remaining / Over Budget totals
- Auto-fill card grid with ON TRACK / WARNING / OVER BUDGET indicators

### Settings Page
- WhatsApp Integration panel (WAHA config: URL, API key, phone, session, toggles)
- Test message + Send Digest Now buttons
- Data export, category management

### WhatsApp Integration (WAHA)
- Replaced OpenWA (Chromium-based, 1–2GB RAM) with WAHA (Baileys-based, ~256MB RAM)
- Budget over-limit alerts (≥80% threshold) sent via WhatsApp
- Transaction bot: send a WhatsApp message → transaction logged automatically
- Daily/weekly digest on demand or scheduled
- Setup guide: `docs/whatsapp-setup.md`

### NLP (Groq / Llama 3.3 70B)
- `backend/services/nlp.py` — async parser with regex fallback
- Endpoint: `POST /api/transactions/parse`
- Used by: Transactions quick-add bar (web UI) and WhatsApp bot
- Graceful degradation: works without `GROQ_API_KEY` (falls back to regex)

### Backend Changes
- `config.py` — pydantic-settings, `db_url` property normalises Render's `postgres://` prefix
- `database.py` — uses `settings.db_url`, conditional `check_same_thread` for SQLite/PG
- `routers/wa.py` — WAHA webhook, NLP parsing, budget alert trigger
- `routers/app_settings.py` — GET/PUT settings, test-wa, digest endpoints
- `routers/transactions.py` — added budget alert background task, `/parse` endpoint
- `services/budget_alert.py` — pure async (no `asyncio.run()`)
- `services/digest.py` — pure async
- `services/app_settings_store.py` — JSON-backed persistent settings
- `requirements.txt` — added `httpx`, `psycopg2-binary`, `groq`

### Deployment Configs
- `render.yaml` — Blueprint for Render: Python web service + free PostgreSQL
- `frontend/vercel.json` — Vite/Vercel config with SPA rewrite rule
- `backend/.env.example` — all required env vars documented
- `frontend/.env.example` — `VITE_API_URL` with local/production instructions
- `DEPLOY.md` — full step-by-step hosting guide

## Hosting Architecture
| Component | Platform | Cost |
|---|---|---|
| Backend API | Render (free tier) | Free (spins down on idle) |
| PostgreSQL | Render (free 90 days) | Free → $7/mo or migrate to Supabase |
| Frontend | Vercel | Free |
| NLP | Groq API | Free (6k req/day) |
| WhatsApp bot | WAHA (Docker, local) | Free |
| Tunnel | Cloudflare Tunnel | Free |

## Key Bugs Fixed
- `asyncio.run()` inside FastAPI BackgroundTasks — replaced with pure async functions
- Render `postgres://` URL prefix — normalised in `config.py`
- WAHA vs OpenWA API differences — endpoint, header, payload, webhook event name
- Missing `services/__init__.py` — created
