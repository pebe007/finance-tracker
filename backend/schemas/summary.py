from typing import List, Optional
from pydantic import BaseModel

from schemas.budget import BudgetStatus


class CategorySpend(BaseModel):
    category_id: Optional[int] = None
    category_name: str
    category_icon: Optional[str] = None
    category_color: Optional[str] = None
    total: float


class MonthlyTrend(BaseModel):
    month: int
    year: int
    income: float
    expense: float
    net: float


class SummaryOut(BaseModel):
    month: int
    year: int
    total_income: float
    total_expense: float
    net: float
    by_category: List[CategorySpend]
    budget_status: List[BudgetStatus]
    monthly_trend: List[MonthlyTrend]
