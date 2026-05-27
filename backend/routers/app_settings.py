"""App settings API — read/write Telegram config and trigger digest."""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from dependencies import require_auth
from services.app_settings_store import AppSettings, load_settings, save_settings
from services.digest import send_monthly_digest
from services.telegram import TelegramService

router = APIRouter(
    prefix="/app-settings",
    tags=["app-settings"],
    dependencies=[Depends(require_auth)],
)


@router.get("/", response_model=AppSettings)
def get_settings() -> AppSettings:
    return load_settings()


@router.put("/", response_model=AppSettings)
def update_settings(body: AppSettings) -> AppSettings:
    save_settings(body)
    return body


@router.post("/test-telegram")
async def test_telegram() -> dict:
    """Send a test Telegram message to verify bot connectivity."""
    cfg = load_settings().telegram
    if not cfg.enabled:
        raise HTTPException(status_code=400, detail="Telegram integration is disabled")
    if not cfg.bot_token or not cfg.chat_id:
        raise HTTPException(
            status_code=400,
            detail="Telegram not fully configured — bot_token and chat_id are required",
        )

    svc = TelegramService()
    ok = await svc.send_message("✅ *FinTrack* — Telegram integration is working!")
    if not ok:
        raise HTTPException(status_code=502, detail="Message delivery failed. Check bot token and chat_id.")
    return {"ok": True, "message": "Test message sent"}


@router.post("/register-webhook")
async def register_webhook(render_url: str) -> dict:
    """Register the Telegram webhook URL with Telegram's servers.

    Pass render_url as a query param, e.g.:
      POST /api/app-settings/register-webhook?render_url=https://fintrack-api.onrender.com
    """
    cfg = load_settings().telegram
    if not cfg.bot_token:
        raise HTTPException(status_code=400, detail="Bot token not configured")

    webhook_url = f"{render_url.rstrip('/')}/api/telegram/webhook"
    svc = TelegramService()
    ok = await svc.set_webhook(webhook_url)
    if not ok:
        raise HTTPException(status_code=502, detail="Failed to register webhook with Telegram")
    return {"ok": True, "webhook_url": webhook_url}


@router.post("/digest")
def trigger_digest(background_tasks: BackgroundTasks) -> dict:
    """Queue a Telegram summary digest for the current month."""
    cfg = load_settings().telegram
    if not cfg.enabled or not cfg.chat_id:
        raise HTTPException(status_code=400, detail="Telegram not configured")
    background_tasks.add_task(send_monthly_digest)
    return {"ok": True, "message": "Digest queued"}
