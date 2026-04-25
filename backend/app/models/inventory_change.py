from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


class InventoryChange(Base):
    __tablename__ = "inventory_changes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False)
    change_type: Mapped[str] = mapped_column(String(50), nullable=False)  # adjust_stock
    payload: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    requested_by: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, approved, rejected
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    product: Mapped["Product"] = relationship("Product")
