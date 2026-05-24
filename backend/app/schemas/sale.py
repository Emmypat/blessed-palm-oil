from datetime import datetime, date
from pydantic import BaseModel, ConfigDict


class SaleItemIn(BaseModel):
    product_id: int
    qty: int
    unit_price: float
    subtotal: float


class SaleItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    qty: int
    unit_price: float
    subtotal: float
    name: str | None = None

    @classmethod
    def from_orm_with_name(cls, item):
        data = {
            "id": item.id,
            "product_id": item.product_id,
            "qty": item.qty,
            "unit_price": float(item.unit_price),
            "subtotal": float(item.subtotal),
            "name": item.product.name if item.product else None,
        }
        return cls(**data)


class SaleCreate(BaseModel):
    customer_id: int | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None
    payment_method: str
    payment_reference: str | None = None
    is_credit: bool = False
    due_date: date | None = None
    total: float
    items: list[SaleItemIn]


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int | None
    customer_name: str | None
    customer_email: str | None
    payment_method: str
    payment_reference: str | None
    total: float
    is_credit: bool
    due_date: date | None = None
    verified: bool
    declined: bool = False
    created_by: str | None = None
    verified_by: str | None = None
    void_requested: bool = False
    void_requested_by: str | None = None
    is_voided: bool = False
    void_approved_by: str | None = None
    created_at: datetime
    items: list[SaleItemOut] = []
