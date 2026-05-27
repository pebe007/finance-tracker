"""Telegram bot webhook — parses incoming messages to create transactions.

Message format (sent to the Telegram bot):
  "coffee 45000"              → expense, 45,000
  "salary 5000000 income"     → income,  5,000,000
  "grab 35000 expense"        → expense, 35,000
  "makan 50rb"                → expense, 50,000  (shorthand: rb=1k)

Sender verification: only the configured chat_id is accepted.
No auth required — Telegram calls this endpoint server-side.
"""
from __future__ import annotations

import datetime as dt
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from database import get_db
from models import Category, Transaction
from services.app_settings_store import load_settings
from services.budget_alert import check_and_alert
from services.nlp import parse_transaction
from services.telegram import TelegramService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    """
    Receives Telegram Bot API webhook updates.
    Expected shape: {"update_id": ..., "message": {"chat": {"id": ...}, "text": "...", ...}}
    """
    cfg = load_settings().telegram
    if not cfg.bot_enabled:
        return {"ok": False, "reason": "bot disabled"}

    try:
        data = await request.json()
    except Exception:  # noqa: BLE001
        return {"ok": False, "reason": "invalid JSON body"}

    # Support both regular messages and edited messages
    message = data.get("message") or data.get("edited_message")
    if not message:
        return {"ok": True, "reason": "no message in update"}

    chat_id = str(message.get("chat", {}).get("id", ""))
    text: str = (message.get("text") or "").strip()

    # Ignore non-text messages (photos, stickers, etc.)
    if not text:
        return {"ok": True, "reason": "no text content"}

    # Ignore bot commands (e.g. /start, /help)
    if text.startswith("/"):
        svc = TelegramService()
        await svc.send_message(
            "👋 *FinTrack Bot*\n\n"
            "Send me a transaction to log it:\n"
            "`coffee 45000`\n"
            "`salary 5000000 income`\n"
            "`grab 35k expense`"
        )
        return {"ok": True}

    # Verify sender matches configured chat_id
    if cfg.chat_id and chat_id != cfg.chat_id:
        logger.warning("Telegram bot: unauthorised chat_id %s", chat_id)
        return {"ok": False, "reason": "unauthorised sender"}

    svc = TelegramService()

    # Fetch categories for NLP context
    categories = [
        {"id": c.id, "name": c.name, "type": c.type}
        for c in db.query(Category).all()
    ]

    # Parse with NLP (Groq) — falls back to regex automatically
    parsed = await parse_transaction(text, categories)
    if not parsed:
        logger.info("Telegram bot: could not parse '%s'", text[:80])
        await svc.send_message(
            f"❌ Could not parse: `{text}`\n\n"
            "Try: `lunch 85000` or `freelance 3500000 income`"
        )
        return {"ok": False, "reason": "could not parse"}

    # Create the transaction
    raw_date = parsed.get("date")
    tx_date = dt.date.fromisoformat(raw_date) if raw_date else dt.date.today()
    tx = Transaction(
        amount=parsed["amount"],
        type=parsed["type"],
        description=parsed.get("description"),
        category_id=parsed.get("category_id"),
        date=tx_date,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    logger.info("Telegram bot created tx id=%s amount=%.2f type=%s", tx.id, tx.amount, tx.type)

    # Confirm to user
    emoji = "💸" if parsed["type"] == "expense" else "💹"
    desc = parsed.get("description") or "Transaction"
    await svc.send_message(
        f"✅ *Logged!*\n"
        f"{emoji} {desc} — {parsed['amount']:,.0f} ({parsed['type']})\n"
        f"📅 {tx_date.strftime('%d %b %Y')}"
    )

    # Budget alert in background
    if cfg.budget_alerts:
        background_tasks.add_task(check_and_alert, tx.id)

    return {"ok": True, "transaction_id": tx.id}
