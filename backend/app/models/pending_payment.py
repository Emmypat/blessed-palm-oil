from datetime import datetime, timezone
from sqlalchemy import Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base


class PendingPayment(Base):
    __tablename__ = "pending_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    receivable_id: Mapped[int] = mapped_column(Integer, ForeignKey("receivables.id"))
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    method: Mapped[str] = mapped_column(String(50))
    reference: Mapped[str | None] = mapped_column(String(200), nullable=True)
    requested_by: Mapped[str] = mapped_column(String(100))
    customer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
