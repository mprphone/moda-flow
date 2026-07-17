from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.core.enums import DevelopmentStatus, Stage
from app.core.timeutil import utcnow
from app.models.label import development_labels


class Development(Base):
    __tablename__ = "developments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(180))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    owner_name: Mapped[str] = mapped_column(String(120))
    cover_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    current_stage: Mapped[str] = mapped_column(String(50), default=Stage.NOVO.value, index=True)
    status: Mapped[str] = mapped_column(String(50), default=DevelopmentStatus.ACTIVE.value, index=True)
    waiting_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    estimated_value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    production_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    client = relationship("Client", back_populates="developments")
    stage_events = relationship("StageEvent", back_populates="development", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="development", cascade="all, delete-orphan")
    shopping = relationship("ShoppingPurchase", back_populates="development")
    productions = relationship("Production", back_populates="development")
    labels = relationship("Label", secondary=development_labels, back_populates="developments")
