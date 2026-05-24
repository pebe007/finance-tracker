from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    type = Column(String(10), nullable=False)   # 'expense' | 'income'
    icon = Column(String(10), nullable=True)    # emoji
    color = Column(String(7), nullable=True)    # hex color e.g. #FF5733

    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")
