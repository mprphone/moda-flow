from app.schemas.common import ORMModel


class SupplierCreate(ORMModel):
    name: str
    category: str = "geral"
    email: str | None = None
    phone: str | None = None


class SupplierOut(SupplierCreate):
    id: int


class SupplierScoreOut(ORMModel):
    supplier_id: int
    name: str
    grade: str
    score: int
    on_time_rate: float
    average_delay_days: float
    active_requests: int
    summary: str
