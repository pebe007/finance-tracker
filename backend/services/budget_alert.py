"""Check budget limits after a transaction is saved and send a Telegram alert if exceeded.

FastAPI's BackgroundTasks can accept async functions directly — no asyncio.run() needed.
"""
from __future__ import annotations

import logging
from datetime import date

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Budget, Category, Transaction
from services.app_settings_store import load_settings
from services.telegram import TelegramService

logger = logging.getLogger(__name__)

# Alert fires when utilisation crosses this threshold (inclusive)
_ALERT_THRESHOLD_PCT = 80.0


async def check_and_alert(transaction_id: int) -> None:
    """
    Open a fresh DB session, check if the saved transaction pushes any budget
    over the alert threshold, and send a Telegram message if so.

    Called as a FastAPI BackgroundTask (async) — runs after the response is sent.
    """
    cfg = load_settings().telegram
    if not cfg.enabled or not cfg.budget_alerts or not cfg.chat_id:
        return

    db: Session = SessionLocal()
    try:
        tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        if not tx or tx.type != "expense" or not tx.category_id:
            return

        tx_date: date = tx.date  # type: ignore[assignment]
        m, y = tx_date.month, tx_date.year

        budget = (
            db.query(Budget)
            .filter(
                Budget.category_id == tx.category_id,
                Budget.month == m,
                Budget.year == y,
            )
            .first()
        )
        if not budget:
            return

        spent_row = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.category_id == tx.category_id,
                Transaction.type == "expense",
                extract("month", Transaction.date) == m,
                extract("year", Transaction.date) == y,
            )
            .scalar()
        )
        spent = float(spent_row or 0)
        limit = float(budget.limit_amount)
        pct = (spent / limit * 100) if limit > 0 else 0.0

        if pct < _ALERT_THRESHOLD_PCT:
            return  # still within safe range — no alert

        cat = db.query(Category).filter(Category.id == tx.category_id).first()
        cat_name = cat.name if cat else "Unknown"
        cat_icon = (cat.icon or "") if cat else ""

        is_over = spent > limit
        header = "🚨 *OVER BUDGET*" if is_over else f"⚠️ *Budget Warning — {pct:.0f}% used*"
        text = (
            f"{header}\n"
            f"{cat_icon} *{cat_name}*\n\n"
            f"Spent:     {spent:>12,.0f}\n"
            f"Limit:     {limit:>12,.0f}\n"
            f"Remaining: {max(limit - spent, 0):>12,.0f}"
        )

        svc = TelegramService()
        await svc.send_message(text)
        logger.info("Budget alert sent for category_id=%s (%.1f%%)", tx.category_id, pct)

    except Exception as exc:  # noqa: BLE001
        logger.error("Budget alert failed for tx_id=%s: %s", transaction_id, exc)
    finally:
        db.close()
