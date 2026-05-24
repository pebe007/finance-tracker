from typing import Optional
from pydantic import BaseModel

from schemas.category import CategoryOut


class BudgetBase(BaseModel):
    category_id: int
    month: int
    year: int
    limit_amount: float


class BudgetCreate(BudgetBase):
    pass


class BudgetOut(BudgetBase):
    id: int
    category: Optional[CategoryOut] = None

    model_config = {"from_attributes": True}


class BudgetStatus(BaseModel):
    budget: BudgetOut
    spent: float
    percentage: float
    remaining: float
    over_budget: bool
