from typing import Optional
from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str
    type: str
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    id: int

    model_config = {"from_attributes": True}
