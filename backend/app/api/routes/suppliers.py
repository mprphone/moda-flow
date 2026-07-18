from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.supplier import Supplier
from app.repositories.supplier_repository import list_all
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from app.models.fabric_request import FabricRequest
from app.models.stage_event import StageEvent
from app.services.scoring.supplier_score import calculate_supplier_score

router = APIRouter()


def serialize_supplier(item) -> dict:
    return {
        "id": item.id, "name": item.name, "category": item.category,
        "email": item.email, "phone": item.phone, "contact_person": item.contact_person,
        "preferred_channel": item.preferred_channel, "meetings": item.meetings, "notes": item.notes,
    }


@router.get("")
def get_suppliers(db: Session = Depends(get_db)):
    return [serialize_supplier(item) for item in list_all(db)]


@router.post("", status_code=201)
def post_supplier(payload: SupplierCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if db.scalar(select(Supplier).where(func.lower(Supplier.name) == name.lower())):
        raise HTTPException(status_code=409, detail="Já existe um fornecedor com esse nome.")
    item = Supplier(**{**payload.model_dump(), "name": name})
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize_supplier(item)


@router.patch("/{supplier_id}")
def patch_supplier(supplier_id: int, payload: SupplierUpdate, db: Session = Depends(get_db)):
    item = db.get(Supplier, supplier_id)
    if not item:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado.")
    data = payload.model_dump(exclude_unset=True)
    if data.get("name"):
        data["name"] = data["name"].strip()
        duplicate = db.scalar(select(Supplier).where(func.lower(Supplier.name) == data["name"].lower(), Supplier.id != supplier_id))
        if duplicate:
            raise HTTPException(status_code=409, detail="Já existe um fornecedor com esse nome.")
    for key, value in data.items():
        setattr(item, key, value)
    db.commit(); db.refresh(item)
    return serialize_supplier(item)


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    item = db.get(Supplier, supplier_id)
    if not item:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado.")
    fabrics = db.scalar(select(func.count()).select_from(FabricRequest).where(FabricRequest.supplier_id == supplier_id)) or 0
    events = db.scalar(select(func.count()).select_from(StageEvent).where(StageEvent.supplier_id == supplier_id)) or 0
    if fabrics or events:
        raise HTTPException(status_code=409, detail=f"Não é possível eliminar: existem {fabrics} malhas e {events} etapas ligadas a este fornecedor.")
    db.delete(item); db.commit()


@router.get("/scores")
def get_supplier_scores(db: Session = Depends(get_db)):
    return [calculate_supplier_score(db, item) for item in list_all(db)]
