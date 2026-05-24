from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_auth
from models import Budget
from schemas.budget import BudgetCreate, BudgetOut

router = APIRouter(prefix="/budgets", tags=["budgets"], dependencies=[Depends(require_auth)])


@router.get("/", response_model=list[BudgetOut])
def list_budgets(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
) -> list[Budget]:
    return (
        db.query(Budget)
        .filter(Budget.month == month, Budget.year == year)
        .all()
    )


@router.post("/", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def upsert_budget(body: BudgetCreate, db: Session = Depends(get_db)) -> Budget:
    """Creates or updates the budget for a category/month/year combination."""
    existing = (
        db.query(Budget)
        .filter(
            Budget.category_id == body.category_id,
            Budget.month == body.month,
            Budget.year == body.year,
        )
        .first()
    )
    if existing:
        existing.limit_amount = body.limit_amount  # type: ignore[assignment]
        db.commit()
        db.refresh(existing)
        return existing

    budget = Budget(**body.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(budget_id: int, db: Session = Depends(get_db)) -> None:
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()
