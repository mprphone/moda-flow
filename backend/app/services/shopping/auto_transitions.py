from sqlalchemy.orm import Session
from app.core.enums import ShoppingStatus
from app.core.timeutil import today
from app.models.shopping import ShoppingPurchase


def apply_auto_transitions(db: Session, purchases: list[ShoppingPurchase]) -> None:
    """Peças em uso cujo prazo de devolução passou mudam sozinhas para 'a devolver'."""
    changed = False
    for item in purchases:
        if item.status == ShoppingStatus.IN_USE.value and item.return_deadline and item.return_deadline < today():
            item.status = ShoppingStatus.TO_RETURN.value
            changed = True
    if changed:
        db.commit()
