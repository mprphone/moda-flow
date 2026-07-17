from app.schemas.common import ORMModel
from app.schemas.development import DevelopmentOut
from app.schemas.shopping import ShoppingOut


class DashboardOut(ORMModel):
    overdue_count: int
    blocked_count: int
    waiting_supplier_count: int
    waiting_client_count: int
    shopping_deadline_count: int
    at_risk: list[DevelopmentOut]
    shopping_alerts: list[ShoppingOut]
