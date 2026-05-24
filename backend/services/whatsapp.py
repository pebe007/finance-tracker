"""WhatsApp notification service — async client for WAHA (WhatsApp HTTP API).

WAHA is a self-hosted, Baileys-based gateway with no Chromium dependency.
Docs: https://waha.devlike.pro/docs/how-to/send-messages/

Send endpoint : POST /api/sendText
Auth header   : X-Api-Key: <key>
Webhook event : "message" (not "message.received" like OpenWA)
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Sends messages via a self-hosted WAHA instance."""

    def __init__(
        self,
        base_url: str,
        api_key: str,
        session_id: str,
        recipient_phone: str,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.session_id = session_id
        self.recipient_phone = recipient_phone

    def _chat_id(self, phone: Optional[str] = None) -> str:
        """Normalise phone → WA chat ID, e.g. '628123456789@c.us'."""
        p = (phone or self.recipient_phone).lstrip("+").replace(" ", "").replace("-", "")
        return f"{p}@c.us"

    async def send_message(self, text: str, phone: Optional[str] = None) -> bool:
        """POST a text message via WAHA. Returns True on success."""
        url = f"{self.base_url}/api/sendText"
        headers = {
            "X-Api-Key": self.api_key,       # WAHA uses X-Api-Key (not X-API-Key)
            "Content-Type": "application/json",
        }
        payload = {
            "session": self.session_id,
            "chatId": self._chat_id(phone),
            "text": text,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code >= 300:
                    logger.warning(
                        "WAHA send failed: HTTP %s — %s", resp.status_code, resp.text[:200]
                    )
                    return False
                return True
        except httpx.RequestError as exc:
            logger.error("WAHA request error: %s", exc)
            return False
