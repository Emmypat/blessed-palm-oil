from datetime import datetime, timezone
from sqlalchemy import String, Numeric, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    balance_owed: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    last_purchase_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    sales: Mapped[list["Sale"]] = relationship("Sale", back_populates="customer")
    receivables: Mapped[list["Receivable"]] = relationship("Receivable", back_populates="customer")
