from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.core.timeutil import utcnow


class Production(Base):
    __tablename__ = "productions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    development_id: Mapped[int] = mapped_column(ForeignKey("developments.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(50), default="encomenda_recebida")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    responsible_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    development = relationship("Development", back_populates="productions")
