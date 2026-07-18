from datetime import datetime
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.core.timeutil import utcnow


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    code: Mapped[str | None] = mapped_column(String(10), nullable=True, index=True)  # código de referência (B001...)
    group_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contact_person: Mapped[str | None] = mapped_column(String(120), nullable=True)
    segments: Mapped[str | None] = mapped_column(String(200), nullable=True)  # Mulher, Criança, Homem...
    preferred_channel: Mapped[str | None] = mapped_column(String(40), nullable=True)  # email/telefone/whatsapp/presencial
    meetings: Mapped[str | None] = mapped_column(Text, nullable=True)  # notas de reuniões/contactos
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    developments = relationship("Development", back_populates="client")
