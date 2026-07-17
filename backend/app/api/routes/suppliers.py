from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.supplier import Supplier
from app.repositories.supplier_repository import list_all
from app.schemas.supplier import SupplierCreate
from app.services.scoring.supplier_score import calculate_supplier_score

router = APIRouter()


@router.get("")
def get_suppliers(db: Session = Depends(get_db)):
    return [{"id": item.id, "name": item.name, "category": item.category, "email": item.email, "phone": item.phone} for item in list_all(db)]


@router.post("", status_code=201)
def post_supplier(payload: SupplierCreate, db: Session = Depends(get_db)):
    item = Supplier(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/scores")
def get_supplier_scores(db: Session = Depends(get_db)):
    return [calculate_supplier_score(db, item) for item in list_all(db)]
