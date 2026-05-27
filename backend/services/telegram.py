"""Telegram Bot API service — sends messages via bot token."""
from __future__ import annotations

import logging

import httpx

from services.app_settings_store import load_settings

logger = logging.getLogger(__name__)

_TELEGRAM_API = "https://api.telegram.org"


class TelegramService:
    def __init__(self) -> None:
        cfg = load_settings().telegram
        self.token: str = cfg.bot_token
        self.chat_id: str = cfg.chat_id
        self.enabled: bool = cfg.enabled

    @property
    def _base(self) -> str:
        return f"{_TELEGRAM_API}/bot{self.token}"

    async def send_message(self, text: str) -> bool:
        """Send a text message to the configured chat. Returns True on success."""
        if not self.enabled or not self.token or not self.chat_id:
            logger.debug("Telegram not configured — skipping message")
            return False
        url = f"{self._base}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "Markdown",  # supports *bold* and _italic_
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code >= 300:
                    logger.error("Telegram sendMessage failed: %s %s", resp.status_code, resp.text)
                    return False
                return True
        except Exception as exc:  # noqa: BLE001
            logger.error("Telegram sendMessage error: %s", exc)
            return False

    async def set_webhook(self, webhook_url: str) -> bool:
        """Register the webhook URL with Telegram."""
        url = f"{self._base}/setWebhook"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json={"url": webhook_url})
                return resp.status_code < 300
        except Exception as exc:  # noqa: BLE001
            logger.error("Telegram setWebhook error: %s", exc)
            return False

    async def delete_webhook(self) -> bool:
        """Remove the registered webhook (switch back to polling)."""
        url = f"{self._base}/deleteWebhook"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url)
                return resp.status_code < 300
        except Exception as exc:  # noqa: BLE001
            logger.error("Telegram deleteWebhook error: %s", exc)
            return False
