from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.core.db import get_db
from app.models.client import Client
from app.models.development import Development
from app.models.production import Production
from app.schemas.production import ProductionCreate, ProductionUpdate

router = APIRouter()

PRODUCTION_STAGES = [
    "encomenda_recebida",
    "materiais",
    "corte",
    "confecao",
    "controlo_qualidade",
    "expedida",
    "cancelada",
]


def serialize_production(item: Production) -> dict:
    client = item.client or (item.development.client if item.development else None)
    return {
        "id": item.id,
        "development_id": item.development_id,
        "development_code": item.development.code if item.development else None,
        "title": item.title or (item.development.title if item.development else None),
        "client_name": client.name if client else "—",
        "quantity": item.quantity,
        "status": item.status,
        "due_date": item.due_date,
        "responsible_name": item.responsible_name,
    }


@router.get("")
def get_productions(db: Session = Depends(get_db)):
    stmt = (
        select(Production)
        .options(
            joinedload(Production.development).joinedload(Development.client),
            joinedload(Production.client),
        )
        .order_by(Production.created_at.desc())
    )
    return {"stages": PRODUCTION_STAGES, "items": [serialize_production(item) for item in db.scalars(stmt).unique().all()]}


@router.post("", status_code=201)
def post_production(payload: ProductionCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    status = data.pop("status", None)
    if status and status not in PRODUCTION_STAGES:
        raise HTTPException(status_code=422, detail="Estado de produção inválido")
    if payload.development_id:
        if not db.get(Development, payload.development_id):
            raise HTTPException(status_code=404, detail="Desenvolvimento não encontrado")
    elif not (payload.title and payload.client_id):
        raise HTTPException(status_code=422, detail="Indique um desenvolvimento, ou título + cliente.")
    if payload.client_id and not db.get(Client, payload.client_id):
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    item = Production(**data)
    if status:
        item.status = status
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "status": item.status}


@router.patch("/{production_id}")
def patch_production(production_id: int, payload: ProductionUpdate, db: Session = Depends(get_db)):
    item = db.get(Production, production_id)
    if not item:
        raise HTTPException(status_code=404, detail="Produção não encontrada")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in PRODUCTION_STAGES:
        raise HTTPException(status_code=422, detail="Estado de produção inválido")
    for key, value in data.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return serialize_production(item)
