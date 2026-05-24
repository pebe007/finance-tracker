# Finance Tracker — Full Rebuild Summary
**Date:** 2026-05-24

## What was done

### Frontend — Full UI Rebuild
Rebuilt all pages from scratch. Old design was narrow-constrained (max-w-*), small text, Indonesian, emoji-heavy, personal/cute style.

**New design targets:**
- Full-width layout (no max-w constraints), sidebar 256 px
- Base font 15 px, larger headings, tabular/monospace numbers via `.num` class
- Dense data tables with 9 px row padding — more data visible per screen
- IT admin aesthetic: sharp 6–10 px border-radius, status badges, structured sections
- English throughout
- Name changed: "Mat" → "Phoebe"

**Files rewritten:**
- `frontend/src/index.css` — new design system: `.card`, `.btn`, `.field`, `.badge`, `.kpi-card`, `.data-table`, `.progress-track`, `.toggle`, `.section-title`, `.num`
- `frontend/src/App.jsx` — sidebar width updated to `ml-64`
- `frontend/src/components/Navbar.jsx` — wider, lucide icons, English, "Phoebe's Finance Hub"
- `frontend/src/pages/Login.jsx` — clean English login
- `frontend/src/pages/Dashboard.jsx` — KPI row × 4, recharts BarChart (6-month trend), category donut, budget status, recent transactions table
- `frontend/src/pages/Transactions.jsx` — full-width table, search, type filter, column visibility picker, dense rows
- `frontend/src/pages/Budgets.jsx` — summary bar, auto-fill card grid with colour-coded status
- `frontend/src/pages/Settings.jsx` — WhatsApp panel + categories + export; all in Section components
- `frontend/src/utils/format.js` — updated `formatCompact` to use K/M/B suffixes

### Backend — WhatsApp Integration (OpenWA)

**New files:**
- `backend/services/whatsapp.py` — async OpenWA HTTP client (`WhatsAppService.send_message`)
- `backend/services/app_settings_store.py` — JSON-file-backed settings store (`app_settings.json`)
- `backend/services/digest.py` — generates and sends monthly WA summary digest
- `backend/services/budget_alert.py` — checks budget after transaction create, sends WA alert if ≥ 80 % used
- `backend/routers/app_settings.py` — `GET/PUT /api/app-settings/`, `POST /api/app-settings/test-wa`, `POST /api/app-settings/digest`
- `backend/routers/wa.py` — `POST /api/wa/webhook` — receives OpenWA webhook, parses messages (`"coffee 45000"`, `"salary 5M income"`, shorthand: `rb`, `k`, `jt`, `m`), creates transactions

**Modified files:**
- `backend/routers/transactions.py` — `create_transaction` now fires `check_and_alert_sync` as a BackgroundTask
- `backend/main.py` — registers `app_settings` and `wa` routers
- `backend/requirements.txt` — added `httpx>=0.27.0`
- `backend/services/seed.py` — updated comment from "Mat's" to "Phoebe's"
- `frontend/src/api/index.js` — added `getAppSettings`, `updateAppSettings`, `testWhatsApp`, `sendDigest`

## WhatsApp features implemented
| Feature | Trigger |
|---|---|
| Budget over-limit alerts | Automatically on `POST /transactions/` if category spend ≥ 80 % of budget |
| Transaction bot | OpenWA → `POST /api/wa/webhook` — parse incoming message, create tx |
| Monthly digest | `POST /api/app-settings/digest` (manual or schedule via cron/WA bot) |

## WhatsApp bot message format
```
coffee 45000           → expense, Rp 45,000, desc="coffee"
grab 35rb              → expense, Rp 35,000 (rb=×1,000)
salary 5jt income      → income,  Rp 5,000,000
netflix 150k expense   → expense, Rp 150,000
```

## OpenWA setup (for the bot webhook)
1. Run OpenWA: `docker compose -f docker-compose.dev.yml up -d`
2. Dashboard at `http://localhost:2886` — create session, scan QR
3. Set webhook URL on the session: `http://YOUR_SERVER/api/wa/webhook`
4. In FinTrack → Settings → WhatsApp, enter URL, API key, session ID, phone; Save
