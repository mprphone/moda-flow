from datetime import datetime
from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base
from app.core.timeutil import utcnow


class UploadSession(Base):
    __tablename__ = "upload_sessions"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    original_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
