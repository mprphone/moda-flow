from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.core.timeutil import utcnow


class Production(Base):
    __tablename__ = "productions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Uma produção pode nascer de um desenvolvimento aprovado ou ser registada
    # diretamente com título + cliente (caso das produções históricas do Trello).
    development_id: Mapped[int | None] = mapped_column(ForeignKey("developments.id"), nullable=True, index=True)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), nullable=True, index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(50), default="encomenda_recebida")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    responsible_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_created_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    trello_card_id: Mapped[str | None] = mapped_column(String(32), nullable=True, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    development = relationship("Development", back_populates="productions")
    client = relationship("Client")
    events = relationship("ProductionEvent", back_populates="production", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="production", cascade="all, delete-orphan")
    fabric_links = relationship("ProductionFabricLink", back_populates="production", cascade="all, delete-orphan")


class ProductionEvent(Base):
    __tablename__ = "production_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    production_id: Mapped[int] = mapped_column(ForeignKey("productions.id", ondelete="CASCADE"), index=True)
    stage: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(30), default="active")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    responsible_name: Mapped[str | None] = mapped_column(String(120), nullable=True)

    production = relationship("Production", back_populates="events")
