from datetime import date
from typing import Optional

from pydantic import BaseModel, field_validator

from schemas.category import CategoryOut


class TransactionBase(BaseModel):
    amount: float
    type: str
    category_id: Optional[int] = None
    description: Optional[str] = None
    date: date


class TransactionCreate(TransactionBase):
    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ("income", "expense"):
            raise ValueError("type must be 'income' or 'expense'")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        return v


class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    type: Optional[str] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    date: Optional[date] = None


class TransactionOut(TransactionBase):
    id: int
    category: Optional[CategoryOut] = None

    model_config = {"from_attributes": True}
