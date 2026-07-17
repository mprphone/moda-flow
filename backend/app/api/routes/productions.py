from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.core.db import get_db
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
]


def serialize_production(item: Production) -> dict:
    return {
        "id": item.id,
        "development_id": item.development_id,
        "development_code": item.development.code,
        "client_name": item.development.client.name,
        "quantity": item.quantity,
        "status": item.status,
        "due_date": item.due_date,
        "responsible_name": item.responsible_name,
    }


@router.get("")
def get_productions(db: Session = Depends(get_db)):
    stmt = select(Production).options(joinedload(Production.development).joinedload(Development.client)).order_by(Production.created_at.desc())
    return {"stages": PRODUCTION_STAGES, "items": [serialize_production(item) for item in db.scalars(stmt).unique().all()]}


@router.post("", status_code=201)
def post_production(payload: ProductionCreate, db: Session = Depends(get_db)):
    development = db.get(Development, payload.development_id)
    if not development:
        raise HTTPException(status_code=404, detail="Desenvolvimento não encontrado")
    item = Production(**payload.model_dump())
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
