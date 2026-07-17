from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.supplier import Supplier


def list_all(db: Session) -> list[Supplier]:
    return list(db.scalars(select(Supplier).order_by(Supplier.name)).all())


def get_by_id(db: Session, supplier_id: int) -> Supplier | None:
    return db.get(Supplier, supplier_id)
