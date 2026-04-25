from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(Integer, ForeignKey("sales.id"), nullable=False, unique=True)
    pdf_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    emailed_to: Mapped[str | None] = mapped_column(String(200), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    sale: Mapped["Sale"] = relationship("Sale", back_populates="receipt")
