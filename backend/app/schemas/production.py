from datetime import date
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


class ProductionOut(ProductionCreate):
    id: int
    status: str
    development_code: str
    client_name: str
