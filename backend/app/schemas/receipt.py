from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ReceiptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sale_id: int
    customer_name: str | None = None
    customer_email: str | None = None
    total: float | None = None
    pdf_url: str | None
    emailed_to: str | None
    sent_at: datetime | None
    created_at: datetime
