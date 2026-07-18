from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base

development_labels = Table(
    "development_labels",
    Base.metadata,
    Column("development_id", ForeignKey("developments.id", ondelete="CASCADE"), primary_key=True),
    Column("label_id", ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True),
)

fabric_labels = Table(
    "fabric_labels",
    Base.metadata,
    Column("fabric_request_id", ForeignKey("fabric_requests.id", ondelete="CASCADE"), primary_key=True),
    Column("label_id", ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True),
)


class Label(Base):
    __tablename__ = "labels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    tone: Mapped[str] = mapped_column(String(20), default="lilac")
    # "development" (etiquetas do quadro de modelos) ou "fabric" (etiquetas de malhas)
    scope: Mapped[str] = mapped_column(String(20), default="development", index=True)

    developments = relationship("Development", secondary=development_labels, back_populates="labels")
    fabrics = relationship("FabricRequest", secondary=fabric_labels, back_populates="labels")
