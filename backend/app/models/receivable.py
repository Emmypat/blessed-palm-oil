from datetime import datetime, timezone
from sqlalchemy import String, Numeric, Integer, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


class Receivable(Base):
    __tablename__ = "receivables"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("customers.id"), nullable=True)
    sale_id: Mapped[int] = mapped_column(Integer, ForeignKey("sales.id"), nullable=False, unique=True)
    customer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    customer_email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    amount_owed: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    amount_paid: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    due_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    paid: Mapped[bool] = mapped_column(Boolean, default=False)
    paid_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    customer: Mapped["Customer | None"] = relationship("Customer", back_populates="receivables")
    sale: Mapped["Sale"] = relationship("Sale", back_populates="receivable")
