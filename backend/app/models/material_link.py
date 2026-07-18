from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.core.timeutil import utcnow


class FabricDevelopmentLink(Base):
    __tablename__ = "fabric_development_links"
    __table_args__ = (UniqueConstraint("fabric_request_id", "development_id", name="uq_fabric_development"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fabric_request_id: Mapped[int] = mapped_column(ForeignKey("fabric_requests.id", ondelete="CASCADE"), index=True)
    development_id: Mapped[int] = mapped_column(ForeignKey("developments.id", ondelete="CASCADE"), index=True)
    relation_type: Mapped[str] = mapped_column(String(30), default="candidate")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    fabric = relationship("FabricRequest", back_populates="development_links")
    development = relationship("Development", back_populates="fabric_links")


class ProductionFabricLink(Base):
    __tablename__ = "production_fabric_links"
    __table_args__ = (UniqueConstraint("production_id", "fabric_request_id", name="uq_production_fabric"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    production_id: Mapped[int] = mapped_column(ForeignKey("productions.id", ondelete="CASCADE"), index=True)
    fabric_request_id: Mapped[int] = mapped_column(ForeignKey("fabric_requests.id", ondelete="CASCADE"), index=True)
    usage_status: Mapped[str] = mapped_column(String(30), default="used")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    production = relationship("Production", back_populates="fabric_links")
    fabric = relationship("FabricRequest", back_populates="production_links")
