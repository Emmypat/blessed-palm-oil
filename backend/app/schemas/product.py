from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ProductBase(BaseModel):
    name: str
    type: str
    unit: str = "bags"
    price: float
    reorder_level: int = 50


class ProductCreate(ProductBase):
    stock_qty: int = 0


class ProductUpdate(ProductBase):
    pass


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    stock_qty: int
    created_at: datetime
    updated_at: datetime


class StockAdjust(BaseModel):
    quantity: int
    reason: str  # restock | correction | damaged
