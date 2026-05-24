from datetime import date as date_type

from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import relationship

from database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(String(10), nullable=False)           # 'income' | 'expense'
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    description = Column(String(255), nullable=True)
    date = Column(Date, nullable=False, default=date_type.today)
    created_at = Column(String, server_default=func.now())  # stored as ISO string for SQLite compat

    category = relationship("Category", back_populates="transactions")
