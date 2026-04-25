from datetime import datetime, date
from pydantic import BaseModel, ConfigDict


class ReceivableOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int | None
    sale_id: int
    customer_name: str | None
    customer_email: str | None
    amount_owed: float
    amount_paid: float
    due_date: date | None
    paid: bool
    paid_date: datetime | None
    created_at: datetime


class RecordPayment(BaseModel):
    amount: float
    method: str
    reference: str | None = None
