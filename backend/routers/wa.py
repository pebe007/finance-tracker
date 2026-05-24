"""WhatsApp bot webhook — parses incoming messages to create transactions.

Message format (sent to the WA bot):
  "coffee 45000"              → expense, Rp 45,000, description="coffee"
  "salary 5000000 income"     → income,  Rp 5,000,000, description="salary"
  "grab 35000 expense"        → expense, Rp 35,000, description="grab"
  "makan 50rb"                → expense, Rp 50,000, description="makan"  (shorthand: rb=1k)

Sender verification: only the configured 'phone' number is accepted.
No auth required — OpenWA calls this endpoint server-side.
"""
from __future__ import annotations

import logging
import re
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from database import get_db
from models import Category, Transaction
from services.app_settings_store import load_settings
from services.nlp import parse_transaction

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wa", tags=["whatsapp"])

# Shorthand multipliers
_MULTIPLIERS: dict[str, int] = {
    "rb": 1_000,
    "k": 1_000,
    "jt": 1_000_000,
    "m": 1_000_000,
    "b": 1_000_000_000,
}


def _parse_amount(token: str) -> float | None:
    """
    Parse amount token. Handles:
      "50000", "50rb", "50k", "1.5jt", "2m"
    Returns None if not parseable.
    """
    token = token.lower().strip()
    for suffix, mult in _MULTIPLIERS.items():
        if token.endswith(suffix):
            numeric = token[: -len(suffix)].replace(",", ".")
            try:
                return float(numeric) * mult
            except ValueError:
                return None
    # plain integer or decimal
    clean = token.replace(",", "").replace(".", "")
    if re.match(r"^\d+$", clean):
        return float(clean)
    return None


def _parse_message(text: str) -> dict[str, Any] | None:
    """
    Parse a raw WA bot message into transaction fields.
    Returns None if the message cannot be understood.
    """
    parts = text.strip().split()
    if len(parts) < 2:
        return None

    # Detect optional trailing type keyword
    tx_type = "expense"
    last = parts[-1].lower()
    if last in ("income", "masuk", "in", "pemasukan"):
        tx_type = "income"
        parts = parts[:-1]
    elif last in ("expense", "keluar", "out", "ex", "pengeluaran"):
        tx_type = "expense"
        parts = parts[:-1]

    if len(parts) < 2:
        return None

    # The last remaining token is the amount
    amount = _parse_amount(parts[-1])
    if amount is None or amount <= 0:
        return None

    description = " ".join(parts[:-1]).strip() or None

    return {
        "amount": amount,
        "type": tx_type,
        "description": description,
        "date": date.today(),
    }


@router.post("/webhook")
async def wa_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    """
    Receives OpenWA webhook events.
    Expected event shape:
      {"event": "message.received", "payload": {"body": "...", "from": "...", "fromMe": false}}
    """
    cfg = load_settings().whatsapp
    if not cfg.bot_enabled:
        return {"ok": False, "reason": "bot disabled"}

    try:
        data = await request.json()
    except Exception:  # noqa: BLE001
        return {"ok": False, "reason": "invalid JSON body"}

    # WAHA uses event="message"; ignore everything else (status updates, etc.)
    if data.get("event") != "message":
        return {"ok": True, "reason": "event ignored"}

    payload: dict = data.get("payload", {})
    if payload.get("fromMe"):
        return {"ok": True, "reason": "own message ignored"}

    # Verify sender matches configured phone (security: only owner can log transactions)
    sender = payload.get("from", "").replace("@c.us", "").strip()
    if cfg.phone and sender != cfg.phone:
        logger.warning("WA bot: unauthorised sender %s", sender)
        return {"ok": False, "reason": "unauthorised sender"}

    body: str = payload.get("body", "").strip()

    # Fetch categories for NLP context
    categories = [
        {"id": c.id, "name": c.name, "type": c.type}
        for c in db.query(Category).all()
    ]

    # Try NLP parser (Groq), falls back to regex automatically
    parsed = await parse_transaction(body, categories)
    if not parsed:
        logger.info("WA bot: could not parse '%s'", body[:80])
        return {
            "ok": False,
            "reason": "could not parse — try: 'coffee 45000' or 'lunch with team 85k expense'",
        }

    import datetime as dt
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
    logger.info("WA bot created tx id=%s amount=%.2f type=%s", tx.id, tx.amount, tx.type)
    return {"ok": True, "transaction_id": tx.id}
