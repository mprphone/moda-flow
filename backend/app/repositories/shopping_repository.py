from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.shopping import ShoppingPurchase


def list_all(db: Session) -> list[ShoppingPurchase]:
    return list(db.scalars(select(ShoppingPurchase).order_by(ShoppingPurchase.purchase_date.desc())).all())
