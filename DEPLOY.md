# Deployment Guide — FinTrack

Full hosting setup: Render (backend API) + Vercel (frontend) + Render PostgreSQL (database) + Groq (NLP) + WAHA + Cloudflare Tunnel (WhatsApp).

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

## Step 4 — WAHA + Cloudflare Tunnel (WhatsApp)

WAHA runs locally on your machine and is exposed to the internet via a Cloudflare Tunnel — no port forwarding required.

### 4a. Install Docker

[docs.docker.com/get-docker](https://docs.docker.com/get-docker/) — install Docker Desktop for Windows.

### 4b. Run WAHA

```bash
docker run -d \
  --name waha \
  --restart unless-stopped \
  -p 3000:3000 \
  -e WHATSAPP_API_KEY=your-secret-key-here \
  devlikeapro/waha
```

Replace `your-secret-key-here` with any strong password you choose. Write it down — you'll enter it in the app Settings later.

### 4c. Connect WhatsApp

1. Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
2. Click **Start Session** → WAHA shows a QR code
3. On your phone: WhatsApp → Linked Devices → Link a Device → scan the QR

Session name defaults to `default`. Keep it as-is unless you change it in Settings.

### 4d. Install Cloudflare Tunnel

```bash
# Windows — download cloudflared
winget install Cloudflare.cloudflared
# OR download .exe from: https://github.com/cloudflare/cloudflared/releases
```

### 4e. Start the tunnel

```bash
cloudflared tunnel --url http://localhost:3000
```

Cloudflare prints a public URL like `https://random-words.trycloudflare.com`. Copy it.

> This URL changes every time you restart cloudflared. For a permanent free URL, create a free [Cloudflare account](https://cloudflare.com) and set up a named tunnel — see [developers.cloudflare.com/cloudflare-one/connections/connect-networks](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks).

### 4f. Register the webhook

WAHA needs to call your Render backend when you send it a WhatsApp message:

```bash
curl -X PUT http://localhost:3000/api/sessions/default \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your-secret-key-here" \
  -d '{
    "webhooks": [{
      "url": "https://fintrack-api.onrender.com/api/wa/webhook",
      "events": ["message"]
    }]
  }'
```

### 4g. Configure in FinTrack Settings

1. Open your Vercel app → **Settings** → **WhatsApp Integration**
2. Fill in:
   - **WAHA URL:** `https://random-words.trycloudflare.com` (your tunnel URL)
   - **API Key:** the key you chose in 4b
   - **Your Phone Number:** international format, no `+`, e.g. `447700900000`
   - **Session ID:** `default`
3. Enable **Budget Alerts** and/or **Transaction Bot**
4. Click **Save**, then **Send Test Message** — you should receive a WhatsApp message

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
| WAHA (Docker) | WhatsApp bot | Free, runs on your machine |
| Cloudflare Tunnel | Expose WAHA publicly | Free |

> **Database after 90 days:** Render's free PostgreSQL expires. Migrate to [Supabase](https://supabase.com) (free forever, 500MB): create a project, copy the connection string, update `DATABASE_URL` in Render env vars.

---

## Supabase Migration (Optional / After 90 Days)

1. [supabase.com](https://supabase.com) → New Project → note the password
2. **Project Settings → Database → Connection string (URI)** → copy it
3. In Render → **fintrack-api → Environment** → update `DATABASE_URL` to the Supabase URI
4. Redeploy — SQLAlchemy recreates all tables automatically on first start
