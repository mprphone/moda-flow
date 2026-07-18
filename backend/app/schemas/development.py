from datetime import date, datetime
from pydantic import Field
from app.schemas.common import ORMModel


class DevelopmentCreate(ORMModel):
    code: str
    title: str
    client_id: int
    owner_name: str
    cover_url: str | None = None
    due_date: date | None = None


class DevelopmentMove(ORMModel):
    to_stage: str
    keep_previous_active: bool = False
    note: str | None = None
    supplier_id: int | None = None
    responsible_name: str | None = None


class QuickUpdate(ORMModel):
    status: str | None = None
    waiting_reason: str | None = None
    description: str | None = None
    due_date: date | None = None
    estimated_value: float | None = None
    production_quantity: int | None = None
    owner_name: str | None = None
    cover_url: str | None = None
    label_ids: list[int] | None = None


class CommentCreate(ORMModel):
    body: str
    author: str = "Utilizador"
    category: str = "nota_interna"


class StageNoteUpdate(ORMModel):
    note: str | None = None


class StageNoteUpsert(ORMModel):
    stage: str
    note: str | None = None


class StageSummary(ORMModel):
    stage: str
    status: str
    started_at: datetime
    ended_at: datetime | None = None
    days: float = 0
    note: str | None = None
    supplier_name: str | None = None


class DevelopmentOut(ORMModel):
    id: int
    code: str
    title: str
    client_id: int
    client_name: str
    owner_name: str
    cover_url: str | None = None
    current_stage: str
    status: str
    waiting_reason: str | None = None
    due_date: date | None = None
    created_at: datetime
    updated_at: datetime
    days_in_stage: float
    next_action: str
    risk: str
    suggestions: list[str] = Field(default_factory=list)


class DevelopmentDetail(DevelopmentOut):
    stage_history: list[StageSummary] = Field(default_factory=list)
