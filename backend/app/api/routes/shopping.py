from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.shopping import ShoppingPurchase
from app.repositories.shopping_repository import list_all
from app.schemas.shopping import ShoppingCreate, ShoppingUpdate
from app.services.shopping.auto_transitions import apply_auto_transitions
from app.services.shopping.serialize_purchase import serialize_purchase

router = APIRouter()


@router.get("")
def get_shopping(db: Session = Depends(get_db)):
    items = list_all(db)
    apply_auto_transitions(db, items)
    return [serialize_purchase(item) for item in items]


@router.post("", status_code=201)
def post_shopping(payload: ShoppingCreate, db: Session = Depends(get_db)):
    item = ShoppingPurchase(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize_purchase(item)


@router.patch("/{purchase_id}")
def patch_shopping(purchase_id: int, payload: ShoppingUpdate, db: Session = Depends(get_db)):
    item = db.get(ShoppingPurchase, purchase_id)
    if not item:
        raise HTTPException(status_code=404, detail="Compra não encontrada")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return serialize_purchase(item)


@router.delete("/{purchase_id}", status_code=204)
def delete_shopping(purchase_id: int, db: Session = Depends(get_db)):
    item = db.get(ShoppingPurchase, purchase_id)
    if not item:
        raise HTTPException(status_code=404, detail="Compra não encontrada")
    db.delete(item)
    db.commit()
