from datetime import date
from app.schemas.common import ORMModel


class ProductionCreate(ORMModel):
    development_id: int
    quantity: int
    due_date: date | None = None
    responsible_name: str | None = None


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
