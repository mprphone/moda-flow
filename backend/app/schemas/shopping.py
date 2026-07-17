from datetime import date
from app.schemas.common import ORMModel


class ShoppingCreate(ORMModel):
    brand: str
    amount: float
    purchase_date: date
    reference: str | None = None
    return_deadline: date | None = None
    invoice_number: str | None = None
    cover_url: str | None = None
    development_id: int | None = None


class ShoppingUpdate(ORMModel):
    status: str | None = None
    credit_note_number: str | None = None
    refund_received: bool | None = None
    return_deadline: date | None = None
    invoice_number: str | None = None


class ShoppingOut(ShoppingCreate):
    id: int
    status: str
    credit_note_number: str | None = None
    refund_received: bool
    days_to_return: int | None = None
