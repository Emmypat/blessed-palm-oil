from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base


class PendingDeletion(Base):
    __tablename__ = "pending_deletions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    entity_label: Mapped[str] = mapped_column(String(300), nullable=False)
    requested_by: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
