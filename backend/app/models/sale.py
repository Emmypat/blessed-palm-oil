from datetime import datetime, timezone
from sqlalchemy import String, Numeric, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("customers.id"), nullable=True)
    customer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    customer_email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    staff_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)  # cash | card | mobile_money
    payment_reference: Mapped[str | None] = mapped_column(String(200), nullable=True)
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    is_credit: Mapped[bool] = mapped_column(Boolean, default=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    declined: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    verified_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    customer: Mapped["Customer | None"] = relationship("Customer", back_populates="sales")
    items: Mapped[list["SaleItem"]] = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="sale", cascade="all, delete-orphan")
    receivable: Mapped["Receivable | None"] = relationship("Receivable", back_populates="sale", uselist=False)
    receipt: Mapped["Receipt | None"] = relationship("Receipt", back_populates="sale", uselist=False)


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    sale: Mapped["Sale"] = relationship("Sale", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="sale_items")
