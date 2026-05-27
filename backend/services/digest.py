"""Build and send the Telegram monthly digest.

Async — pass directly to FastAPI BackgroundTasks; no asyncio.run() needed.
"""
from __future__ import annotations

import logging
from datetime import date

from sqlalchemy import func

from database import SessionLocal
from models import Category, Transaction
from services.app_settings_store import load_settings
from services.telegram import TelegramService

logger = logging.getLogger(__name__)

_MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


async def send_monthly_digest(month: int | None = None, year: int | None = None) -> None:
    """
    Fetch the current (or specified) month's summary and push it to Telegram.
    Called as a FastAPI BackgroundTask (async).
    """
    cfg = load_settings().telegram
    if not cfg.enabled or not cfg.chat_id:
        logger.debug("Telegram not configured — skipping digest")
        return

    db = SessionLocal()
    try:
        now = date.today()
        m = month or now.month
        y = year or now.year
        month_str = f"{m:02d}"
        year_str = str(y)

        # ── Income / expense totals ──
        rows = (
            db.query(Transaction.type, func.sum(Transaction.amount).label("total"))
            .filter(
                func.strftime("%m", Transaction.date) == month_str,
                func.strftime("%Y", Transaction.date) == year_str,
            )
            .group_by(Transaction.type)
            .all()
        )
        totals: dict[str, float] = {r.type: float(r.total) for r in rows}
        income  = totals.get("income",  0.0)
        expense = totals.get("expense", 0.0)
        net     = income - expense

        # ── Top 3 expense categories ──
        cat_rows = (
            db.query(
                Category.name.label("cat"),
                Category.icon.label("icon"),
                func.sum(Transaction.amount).label("total"),
            )
            .join(Category, Transaction.category_id == Category.id)
            .filter(
                Transaction.type == "expense",
                func.strftime("%m", Transaction.date) == month_str,
                func.strftime("%Y", Transaction.date) == year_str,
            )
            .group_by(Category.name, Category.icon)
            .order_by(func.sum(Transaction.amount).desc())
            .limit(3)
            .all()
        )

        lines = [
            f"📊 *FinTrack Digest — {_MONTHS[m - 1]} {y}*",
            "",
            f"💹 Income:   {income:>14,.0f}",
            f"💸 Expense:  {expense:>14,.0f}",
            f"{'💰' if net >= 0 else '⚠️'} Net:      {net:>14,.0f}",
        ]

        if cat_rows:
            lines += ["", "📌 *Top Expenses:*"]
            for row in cat_rows:
                icon = (row.icon or "•") + " " if row.icon else ""
                lines.append(f"   {icon}{row.cat}: {float(row.total):,.0f}")

        lines += ["", "_Sent by FinTrack_"]

        svc = TelegramService()
        await svc.send_message("\n".join(lines))
        logger.info("Digest sent for %s-%s", y, m)

    except Exception as exc:  # noqa: BLE001
        logger.error("Digest failed: %s", exc)
    finally:
        db.close()
