from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.core.enums import ShoppingStatus
from app.core.timeutil import utcnow


class ShoppingPurchase(Base):
    __tablename__ = "shopping_purchases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    brand: Mapped[str] = mapped_column(String(120))
    reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    purchase_date: Mapped[date] = mapped_column(Date)
    return_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default=ShoppingStatus.IN_USE.value)
    invoice_number: Mapped[str | None] = mapped_column(String(120), nullable=True)
    credit_note_number: Mapped[str | None] = mapped_column(String(120), nullable=True)
    refund_received: Mapped[bool] = mapped_column(Boolean, default=False)
    invoice_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    credit_note_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachments_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    development_id: Mapped[int | None] = mapped_column(ForeignKey("developments.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    development = relationship("Development", back_populates="shopping")
