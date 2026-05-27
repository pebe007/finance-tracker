# Deployment Guide — FinTrack

Full hosting setup: Render (backend API) + Vercel (frontend) + Render PostgreSQL (database) + Groq (NLP) + Telegram Bot (notifications).

---

## Prerequisites

- GitHub account (free) — [github.com](https://github.com)
- Your `finance-tracker` folder pushed to a GitHub repository

### Push to GitHub

```bash
cd "D:\Claude Cowork\finance-tracker"
git init
git add .
git commit -m "initial commit"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/finance-tracker.git
git push -u origin main
```

---

## Step 1 — Groq API Key (NLP)

1. Go to [console.groq.com](https://console.groq.com) → sign up free
2. Click **API Keys** → **Create API Key**
3. Copy the key — you'll paste it into Render later

Free tier: 30 req/min, 6 000 req/day. More than enough for personal use.

---

## Step 2 — Render (Backend + PostgreSQL)

### 2a. Create account

[render.com](https://render.com) → sign up → connect your GitHub account

### 2b. Deploy via render.yaml (recommended)

1. In the Render dashboard click **New → Blueprint**
2. Select your `finance-tracker` repo
3. Render reads `render.yaml` automatically and creates:
   - **fintrack-api** — Python web service (backend)
   - **fintrack-db** — PostgreSQL database
4. Click **Apply**

### 2c. Set environment variables

After the blueprint deploys, go to **fintrack-api → Environment**:

| Key | Value |
|---|---|
| `ADMIN_PASSWORD` | Pick a strong password — this is your login |
| `FRONTEND_URL` | Leave blank for now; fill in after Vercel deploy (Step 3) |
| `GROQ_API_KEY` | Paste the key from Step 1 |

`DATABASE_URL` and `JWT_SECRET` are set automatically by the blueprint.

### 2d. Confirm the API is live

Open `https://fintrack-api.onrender.com/health` — should return `{"status":"ok"}`.

> **Note:** Free Render web services spin down after 15 min of inactivity. First request after idle takes ~30 s. Upgrade to Starter ($7/mo) to keep it always-on.

---

## Step 3 — Vercel (Frontend)

### 3a. Create account

[vercel.com](https://vercel.com) → sign up → connect GitHub

### 3b. Import project

1. **New Project** → select your `finance-tracker` repo
2. Set **Root Directory** to `frontend`
3. Vercel detects Vite automatically (via `vercel.json`)

### 3c. Set environment variable

In **Project → Settings → Environment Variables**:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://fintrack-api.onrender.com` |

4. Click **Deploy**

### 3d. Update FRONTEND_URL on Render

Once Vercel gives you a URL (e.g. `https://fintrack.vercel.app`):

1. Go back to Render → **fintrack-api → Environment**
2. Set `FRONTEND_URL` to that Vercel URL
3. Click **Save Changes** — Render redeploys automatically (CORS fix)

---

## Step 4 — Telegram Bot (Notifications + Transaction Logging)

No extra hosting needed. Telegram connects directly to your Render backend via webhook — completely free forever.

### 4a. Create a Telegram bot

1. Open Telegram → search **@BotFather** → start a chat
2. Send `/newbot` → follow prompts → pick a name and username (e.g. `FinTrackBot`)
3. BotFather replies with a **bot token** like `1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ` — copy it

### 4b. Get your Chat ID

1. Message your new bot: `/start`
2. Open this URL in your browser (replace `TOKEN` with your actual token):
   ```
   https://api.telegram.org/botTOKEN/getUpdates
   ```
3. Find `"chat": {"id": 123456789}` in the response — that number is your **chat_id**

### 4c. Configure in FinTrack Settings

1. Open your Vercel app → **Settings → Telegram Integration**
2. Fill in:
   - **Bot Token:** paste from step 4a
   - **Your Chat ID:** paste from step 4b
3. Enable **Budget Alerts** and/or **Transaction Bot**
4. Click **Save Settings**

### 4d. Register the webhook

Still in Settings → Telegram Integration:

1. Confirm the **Render URL** field shows `https://fintrack-api.onrender.com`
2. Click **Register Webhook**
3. You should see: `Webhook registered: https://fintrack-api.onrender.com/api/telegram/webhook`

This tells Telegram to forward all bot messages to your Render backend. Do this once — it persists permanently.

### 4e. Test it

1. Click **Send Test** in Settings — you should receive a Telegram message from your bot
2. Message the bot directly: `coffee 45000` → bot replies with confirmation and logs the transaction
3. Message: `salary 5000000 income` → logged as income

> **Webhook is permanent.** Unlike WAHA, there's no QR scan, no container to keep running, nothing to maintain. If you redeploy to a new URL, run Register Webhook again.

---

## Step 5 — Verify Everything

| Check | Expected result |
|---|---|
| `https://fintrack-api.onrender.com/health` | `{"status":"ok"}` |
| Vercel frontend loads | Login page appears |
| Login with your `ADMIN_PASSWORD` | Dashboard shows |
| Add a transaction | Appears in the list |
| Send a WA message (e.g. `lunch 50000`) | Bot replies with confirmation |
| Spend over budget | WA budget alert received |

---

## Summary of Free Services Used

| Service | What for | Free limit |
|---|---|---|
| Render | Backend API hosting | 750 hrs/mo (enough for 1 service) |
| Render PostgreSQL | Database | Free for 90 days, then $7/mo |
| Vercel | Frontend hosting | Unlimited for personal projects |
| Groq | NLP (Llama 3.3 70B) | 6 000 req/day, 30 req/min |
| Telegram Bot API | Notifications + transaction bot | Free forever |

> **Database after 90 days:** Render's free PostgreSQL expires. Migrate to [Supabase](https://supabase.com) (free forever, 500MB): create a project, copy the connection string, update `DATABASE_URL` in Render env vars.

---

## Supabase Migration (Optional / After 90 Days)

1. [supabase.com](https://supabase.com) → New Project → note the password
2. **Project Settings → Database → Connection string (URI)** → copy it
3. In Render → **fintrack-api → Environment** → update `DATABASE_URL` to the Supabase URI
4. Redeploy — SQLAlchemy recreates all tables automatically on first start
