from datetime import date
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_auth
from models import Category, Transaction
from schemas.transaction import TransactionCreate, TransactionOut, TransactionUpdate
from services.budget_alert import check_and_alert
from services.nlp import parse_transaction

router = APIRouter(
    prefix="/transactions", tags=["transactions"], dependencies=[Depends(require_auth)]
)


@router.get("/", response_model=List[TransactionOut])
def list_transactions(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    category_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> List[Transaction]:
    q = db.query(Transaction)

    if month and year:
        start = date(year, month, 1)
        if month == 12:
            end = date(year + 1, 1, 1)
        else:
            end = date(year, month + 1, 1)
        q = q.filter(Transaction.date >= start, Transaction.date < end)
    elif year:
        q = q.filter(Transaction.date >= date(year, 1, 1), Transaction.date < date(year + 1, 1, 1))

    if category_id:
        q = q.filter(Transaction.category_id == category_id)
    if type:
        q = q.filter(Transaction.type == type)

    return q.order_by(Transaction.date.desc()).offset(offset).limit(limit).all()


@router.post("/", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    body: TransactionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> Transaction:
    tx = Transaction(**body.model_dump())
    db.add(tx)
    db.commit()
    db.refresh(tx)
    # Fire budget alert check after response is sent (non-blocking, async-safe)
    background_tasks.add_task(check_and_alert, tx.id)
    return tx


@router.put("/{tx_id}", response_model=TransactionOut)
def update_transaction(
    tx_id: int, body: TransactionUpdate, db: Session = Depends(get_db)
) -> Transaction:
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(tx, field, value)

    db.commit()
    db.refresh(tx)
    return tx


class ParseRequest(BaseModel):
    text: str


class ParseResponse(BaseModel):
    amount: float
    type: str
    description: Optional[str]
    category_id: Optional[int]
    date: str


@router.post("/parse", response_model=ParseResponse)
async def parse_text(body: ParseRequest, db: Session = Depends(get_db)) -> dict:
    """
    Parse a natural language string into transaction fields using Groq NLP.
    Falls back to regex if Groq is not configured or fails.
    Used by the web UI quick-add bar.
    """
    categories = [
        {"id": c.id, "name": c.name, "type": c.type}
        for c in db.query(Category).all()
    ]
    result = await parse_transaction(body.text, categories)
    if not result:
        raise HTTPException(
            status_code=422,
            detail="Could not parse the text into a transaction. "
                   "Try: 'coffee 45000' or 'lunch with team 85k expense'.",
        )
    return result


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(tx_id: int, db: Session = Depends(get_db)) -> None:
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
