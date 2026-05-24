from datetime import date
from typing import List, Tuple

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_auth
from models import Budget, Category, Transaction
from schemas.budget import BudgetOut, BudgetStatus
from schemas.summary import CategorySpend, MonthlyTrend, SummaryOut

router = APIRouter(prefix="/summary", tags=["summary"], dependencies=[Depends(require_auth)])


def _month_bounds(year: int, month: int) -> Tuple[date, date]:
    """Returns (start, end) date bounds for a given month (end is exclusive)."""
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


@router.get("/", response_model=SummaryOut)
def get_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
) -> SummaryOut:
    start, end = _month_bounds(year, month)

    # --- Totals for the requested month ---
    rows = (
        db.query(Transaction.type, func.sum(Transaction.amount).label("total"))
        .filter(Transaction.date >= start, Transaction.date < end)
        .group_by(Transaction.type)
        .all()
    )
    totals = {r.type: float(r.total) for r in rows}
    total_income = totals.get("income", 0.0)
    total_expense = totals.get("expense", 0.0)

    # --- Spending by category (expenses only) ---
    cat_rows = (
        db.query(
            Transaction.category_id,
            Category.name.label("cat_name"),
            Category.icon.label("cat_icon"),
            Category.color.label("cat_color"),
            func.sum(Transaction.amount).label("total"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.date >= start,
            Transaction.date < end,
            Transaction.type == "expense",
        )
        .group_by(Transaction.category_id, Category.name, Category.icon, Category.color)
        .all()
    )
    by_category = [
        CategorySpend(
            category_id=r.category_id,
            category_name=r.cat_name or "Uncategorized",
            category_icon=r.cat_icon,
            category_color=r.cat_color,
            total=float(r.total),
        )
        for r in cat_rows
    ]

    # --- Budget status ---
    budgets = (
        db.query(Budget)
        .filter(Budget.month == month, Budget.year == year)
        .all()
    )
    budget_status: list[BudgetStatus] = []
    for b in budgets:
        spent_row = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.category_id == b.category_id,
                Transaction.type == "expense",
                Transaction.date >= start,
                Transaction.date < end,
            )
            .scalar()
        )
        spent = float(spent_row or 0)
        limit = float(b.limit_amount)
        pct = round((spent / limit * 100) if limit > 0 else 0, 1)
        budget_status.append(
            BudgetStatus(
                budget=BudgetOut.model_validate(b),
                spent=spent,
                percentage=pct,
                remaining=max(limit - spent, 0),
                over_budget=spent > limit,
            )
        )

    # --- Monthly trend (last 6 months including current) ---
    trend: list[MonthlyTrend] = []
    y, m = year, month
    for _ in range(6):
        t_start, t_end = _month_bounds(y, m)
        t_rows = (
            db.query(Transaction.type, func.sum(Transaction.amount).label("total"))
            .filter(Transaction.date >= t_start, Transaction.date < t_end)
            .group_by(Transaction.type)
            .all()
        )
        t_totals = {r.type: float(r.total) for r in t_rows}
        inc = t_totals.get("income", 0.0)
        exp = t_totals.get("expense", 0.0)
        trend.append(MonthlyTrend(month=m, year=y, income=inc, expense=exp, net=inc - exp))
        # Step back one month
        m -= 1
        if m == 0:
            m = 12
            y -= 1

    trend.reverse()  # oldest → newest

    return SummaryOut(
        month=month,
        year=year,
        total_income=total_income,
        total_expense=total_expense,
        net=total_income - total_expense,
        by_category=by_category,
        budget_status=budget_status,
        monthly_trend=trend,
    )
