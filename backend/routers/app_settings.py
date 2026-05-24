"""App settings API — read/write WhatsApp config and trigger digest."""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from dependencies import require_auth
from services.app_settings_store import AppSettings, load_settings, save_settings
from services.digest import send_monthly_digest
from services.whatsapp import WhatsAppService

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


@router.post("/test-wa")
async def test_whatsapp() -> dict:
    """Send a test WhatsApp message to verify connectivity."""
    cfg = load_settings().whatsapp
    if not cfg.enabled:
        raise HTTPException(status_code=400, detail="WhatsApp integration is disabled")
    if not cfg.api_key or not cfg.session_id or not cfg.phone:
        raise HTTPException(status_code=400, detail="WhatsApp not fully configured (api_key, session_id, phone required)")

    svc = WhatsAppService(cfg.openwa_url, cfg.api_key, cfg.session_id, cfg.phone)
    ok = await svc.send_message("✅ FinTrack — WhatsApp integration is working!")
    if not ok:
        raise HTTPException(status_code=502, detail="Message delivery failed. Check OpenWA logs.")
    return {"ok": True, "message": "Test message sent"}


@router.post("/digest")
def trigger_digest(background_tasks: BackgroundTasks) -> dict:
    """Queue a WhatsApp summary digest for the current month."""
    cfg = load_settings().whatsapp
    if not cfg.enabled or not cfg.phone:
        raise HTTPException(status_code=400, detail="WhatsApp not configured")
    background_tasks.add_task(send_monthly_digest)
    return {"ok": True, "message": "Digest queued"}
