"""Persistent app settings (WhatsApp config, etc.) stored in a JSON sidecar file."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Stored alongside the database file, one directory above this module's services/ folder
_SETTINGS_FILE = Path(__file__).parent.parent / "app_settings.json"


class WhatsAppConfig(BaseModel):
    enabled: bool = False
    openwa_url: str = "http://localhost:2785"
    api_key: str = ""
    session_id: str = ""
    phone: str = ""           # recipient — digits only, e.g. "628123456789"
    budget_alerts: bool = True
    bot_enabled: bool = True  # allow logging transactions via WA bot
    digest_enabled: bool = False
    digest_schedule: str = "daily"  # "daily" | "weekly"


class AppSettings(BaseModel):
    whatsapp: WhatsAppConfig = WhatsAppConfig()


def load_settings() -> AppSettings:
    """Load settings from JSON; return defaults if file is missing or corrupt."""
    if not _SETTINGS_FILE.exists():
        return AppSettings()
    try:
        data = json.loads(_SETTINGS_FILE.read_text(encoding="utf-8"))
        return AppSettings.model_validate(data)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not parse app_settings.json (%s) — using defaults", exc)
        return AppSettings()


def save_settings(settings: AppSettings) -> None:
    """Persist settings atomically."""
    _SETTINGS_FILE.write_text(settings.model_dump_json(indent=2), encoding="utf-8")
