from datetime import date, datetime
from app.schemas.common import ORMModel


class ProductionCreate(ORMModel):
    development_id: int | None = None
    title: str | None = None
    client_id: int | None = None
    quantity: int = 0
    due_date: date | None = None
    responsible_name: str | None = None
    status: str | None = None


class ProductionUpdate(ORMModel):
    status: str | None = None
    quantity: int | None = None
    due_date: date | None = None
    responsible_name: str | None = None
    client_id: int | None = None
    development_id: int | None = None
    title: str | None = None
    description: str | None = None
    source_created_at: datetime | None = None
    trello_card_id: str | None = None


class ProductionOut(ProductionCreate):
    id: int
    status: str
    development_code: str
    client_name: str
    source_created_at: datetime | None = None
    trello_card_id: str | None = None
