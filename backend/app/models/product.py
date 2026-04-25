from datetime import datetime, timezone
from sqlalchemy import String, Numeric, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), default="bags")
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    stock_qty: Mapped[int] = mapped_column(Integer, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, default=50)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    sale_items: Mapped[list["SaleItem"]] = relationship("SaleItem", back_populates="product")
