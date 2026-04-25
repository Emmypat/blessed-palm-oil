from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class CustomerBase(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    balance_owed: float
    last_purchase_date: datetime | None = None
    created_at: datetime
