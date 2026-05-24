# Finance Tracker

Personal finance tracker — FastAPI backend + React frontend. Tracks expenses, income, and monthly budgets.

## Stack
- **Backend:** Python 3.12, FastAPI, SQLAlchemy, PostgreSQL
- **Frontend:** React 18, Vite, Tailwind CSS, Recharts
- **Hosting:** Railway (backend + DB) + Vercel (frontend)

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # Edit .env — leave DATABASE_URL as sqlite for local dev
uvicorn main:app --reload
```

API runs at `http://localhost:8000`  
Docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # Leave VITE_API_URL blank — Vite proxies /api to localhost:8000
npm run dev
```

App runs at `http://localhost:5173`

---

## Deployment

### 1. Railway (backend + database)

1. Create a Railway project at [railway.app](https://railway.app)
2. Add a **PostgreSQL** database plugin
3. Add a new service → deploy from the `backend/` folder
4. Set environment variables in Railway:
   - `DATABASE_URL` — auto-injected by Railway
   - `JWT_SECRET` — run `python -c "import secrets; print(secrets.token_hex(32))"`
   - `ADMIN_PASSWORD` — your login password
   - `FRONTEND_URL` — set after Vercel deploy

### 2. Vercel (frontend)

1. Push `frontend/` to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Set environment variable: `VITE_API_URL=https://your-app.railway.app`
4. Deploy

### 3. Update CORS

After deploying, go back to Railway and set `FRONTEND_URL` to your Vercel URL.

---

## Default Login

Password is whatever you set as `ADMIN_PASSWORD` in your Railway environment variables.

---

## Phase 2 (Optional) — Telegram Bot

See `finance_tracker_plan.md` for implementation details.
