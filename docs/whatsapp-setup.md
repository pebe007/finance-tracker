# WhatsApp Integration — Setup Guide
Uses [OpenWA](https://github.com/rmyndharis/OpenWA) (self-hosted, free, no API fees).

---

## 1. Run OpenWA

```bash
git clone https://github.com/rmyndharis/OpenWA.git
cd OpenWA
docker compose -f docker-compose.dev.yml up -d
```

Services started:
| URL | Purpose |
|-----|---------|
| `http://localhost:2886` | Dashboard (session management) |
| `http://localhost:2785/api` | REST API |
| `http://localhost:2785/api/docs` | Swagger UI |

---

## 2. Create an API Key

1. Open `http://localhost:2886`
2. Go to **API Keys** → **Create**
3. Copy the generated key — you'll paste this into FinTrack

---

## 3. Create a Session and Scan QR

1. Dashboard → **Sessions** → **New Session**
2. Name it anything (e.g. `fintrack`)
3. Click **Start** → **Show QR**
4. Open WhatsApp on your phone → **Linked Devices** → **Link a Device** → scan

Session status should turn **Connected**.

---

## 4. Register the Webhook

In the OpenWA dashboard:
1. Open your session → **Webhooks** tab
2. Add a new webhook:
   - **URL:** `http://YOUR_SERVER_IP:8000/api/wa/webhook`
     *(replace with your actual backend URL — must be reachable by OpenWA)*
   - **Events:** tick `message.received`
   - **Secret:** leave blank (or add HMAC later)
3. Save

> **Local dev tip:** If both FinTrack and OpenWA run on the same machine,
> use `http://host.docker.internal:8000/api/wa/webhook` as the webhook URL
> so OpenWA's Docker container can reach your local FastAPI.

---

## 5. Configure FinTrack

Open FinTrack → **Settings** → **WhatsApp Integration**:

| Field | Value |
|-------|-------|
| OpenWA URL | `http://localhost:2785` |
| API Key | *(the key from step 2)* |
| Session ID | `fintrack` *(or whatever you named it)* |
| Recipient Phone | Your number, digits only — `628123456789` |

Toggle **Enable WhatsApp Integration** → ON.

Enable whichever features you want:
- **Budget alerts** — fires automatically when a category hits ≥ 80 % of its limit
- **Transaction bot** — send messages to yourself to log transactions
- **Digest** — click *Send Digest Now* in Settings, or wire up a cron to POST `/api/app-settings/digest`

Click **Save Settings**, then **Send Test** to verify the connection.

---

## 6. Bot Message Format

Send a WhatsApp message **to yourself** (the number linked to the session):

| Message | Result |
|---------|--------|
| `coffee 45000` | Expense, Rp 45,000, desc = "coffee" |
| `grab 35rb` | Expense, Rp 35,000 (`rb` = × 1,000) |
| `netflix 150k expense` | Expense, Rp 150,000 |
| `salary 5jt income` | Income, Rp 5,000,000 (`jt` = × 1,000,000) |
| `freelance 2m income` | Income, Rp 2,000,000 (`m` = × 1,000,000) |

**Shorthand multipliers:** `rb` / `k` = ×1 K &nbsp;|&nbsp; `jt` / `m` = ×1 M &nbsp;|&nbsp; `b` = ×1 B

Default type is **expense** if omitted.

---

## 7. Send a Scheduled Digest (optional)

To automate the daily/weekly digest, add a cron job on your server:

```bash
# Daily at 08:00 — adjust to taste
0 8 * * * curl -s -X POST http://localhost:8000/api/app-settings/digest \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Or trigger it manually from **Settings → Send Digest Now**.

---

## 8. Ports Reference

| Service | Port | Notes |
|---------|------|-------|
| FinTrack API | `8000` | `uvicorn main:app` |
| FinTrack Frontend | `5173` | `npm run dev` |
| OpenWA API | `2785` | Docker |
| OpenWA Dashboard | `2886` | Docker |
