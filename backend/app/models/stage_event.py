from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.core.timeutil import utcnow


class StageEvent(Base):
    __tablename__ = "stage_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    development_id: Mapped[int] = mapped_column(ForeignKey("developments.id"), index=True)
    stage: Mapped[str] = mapped_column(String(50), index=True)
    status: Mapped[str] = mapped_column(String(30), default="active")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    promised_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    responsible_name: Mapped[str | None] = mapped_column(String(120), nullable=True)

    development = relationship("Development", back_populates="stage_events")
    supplier = relationship("Supplier", back_populates="stage_events")
