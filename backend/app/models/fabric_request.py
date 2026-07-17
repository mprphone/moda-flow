from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.core.timeutil import today, utcnow

FABRIC_STATUSES = [
    "pedido",
    "envio_em_curso",
    "recebida",
    "tingimento",
    "cancelada",
]


class FabricRequest(Base):
    __tablename__ = "fabric_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reference: Mapped[str] = mapped_column(String(120))
    article: Mapped[str | None] = mapped_column(String(120), nullable=True)
    composition: Mapped[str | None] = mapped_column(String(120), nullable=True)
    width: Mapped[str | None] = mapped_column(String(40), nullable=True)
    grammage: Mapped[str | None] = mapped_column(String(40), nullable=True)
    color: Mapped[str | None] = mapped_column(String(120), nullable=True)
    quantity_meters: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    price_per_meter: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    leadtime: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="pedido", index=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True, index=True)
    development_id: Mapped[int | None] = mapped_column(ForeignKey("developments.id"), nullable=True, index=True)
    requested_at: Mapped[date] = mapped_column(Date, default=today)
    received_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    supplier = relationship("Supplier")
    development = relationship("Development")
