from datetime import datetime, timezone
from sqlalchemy import String, Numeric, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(Integer, ForeignKey("sales.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(50), nullable=False)
    reference: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    sale: Mapped["Sale"] = relationship("Sale", back_populates="payments")
