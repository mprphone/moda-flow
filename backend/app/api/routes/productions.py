from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload, selectinload
from app.core.db import get_db
from app.core.timeutil import utcnow
from app.models.client import Client
from app.models.comment import Comment
from app.models.development import Development
from app.models.fabric_request import FabricRequest
from app.models.production import Production, ProductionEvent
from app.models.material_link import FabricDevelopmentLink, ProductionFabricLink
from app.schemas.common import ORMModel
from app.schemas.development import CommentCreate
from app.schemas.production import ProductionCreate, ProductionUpdate
from app.services.fabrics.serialize_request import serialize_request

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
STAGE_LABELS = {
    "encomenda_recebida": "Encomenda recebida",
    "materiais": "Materiais",
    "corte": "Corte",
    "confecao": "ConfeÃ§Ã£o",
    "controlo_qualidade": "Controlo qualidade",
    "expedida": "Expedida",
    "cancelada": "Cancelada",
}

LOAD_OPTIONS = (
    joinedload(Production.development).joinedload(Development.client),
    joinedload(Production.client),
    selectinload(Production.events),
    selectinload(Production.comments),
    selectinload(Production.fabric_links).joinedload(ProductionFabricLink.fabric).joinedload(FabricRequest.supplier),
    selectinload(Production.fabric_links).joinedload(ProductionFabricLink.fabric).selectinload(FabricRequest.labels),
    selectinload(Production.fabric_links).joinedload(ProductionFabricLink.fabric).selectinload(FabricRequest.development_links).joinedload(FabricDevelopmentLink.development),
)

USAGE_STATUSES = {"candidate", "approved", "used", "alternative", "rejected"}


class StageNoteUpdate(ORMModel):
    note: str | None = None


class StageNoteUpsert(ORMModel):
    stage: str
    note: str | None = None


class FabricUsageCreate(ORMModel):
    fabric_request_id: int
    usage_status: str = "used"
    note: str | None = None


class FabricUsageUpdate(ORMModel):
    usage_status: str | None = None
    note: str | None = None


def load_by_id(db: Session, production_id: int) -> Production | None:
    stmt = select(Production).where(Production.id == production_id).options(*LOAD_OPTIONS)
    return db.scalars(stmt).unique().first()


def serialize_production(item: Production) -> dict:
    client = item.client or (item.development.client if item.development else None)
    return {
        "id": item.id,
        "development_id": item.development_id,
        "development_code": item.development.code if item.development else None,
        "title": item.title or (item.development.title if item.development else None),
        "client_id": client.id if client else None,
        "client_name": client.name if client else "â€”",
        "quantity": item.quantity,
        "status": item.status,
        "due_date": item.due_date,
        "responsible_name": item.responsible_name,
        "description": item.description,
    }


def serialize_detail(item: Production, db: Session) -> dict:
    data = serialize_production(item)
    # Cruzamento: desenvolvimento de origem + malhas desse desenvolvimento
    data["development"] = {
        "id": item.development.id,
        "code": item.development.code,
        "title": item.development.title,
        "current_stage": item.development.current_stage,
    } if item.development else None
    if item.development_id:
        fabric_stmt = (
            select(FabricRequest)
            .outerjoin(FabricDevelopmentLink, FabricDevelopmentLink.fabric_request_id == FabricRequest.id)
            .where(or_(FabricRequest.development_id == item.development_id, FabricDevelopmentLink.development_id == item.development_id))
            .options(joinedload(FabricRequest.supplier), joinedload(FabricRequest.development), selectinload(FabricRequest.labels), selectinload(FabricRequest.development_links).joinedload(FabricDevelopmentLink.development))
            .order_by(FabricRequest.requested_at.desc())
        )
        data["fabric_requests"] = [serialize_request(f) for f in db.scalars(fabric_stmt).unique().all()]
    else:
        data["fabric_requests"] = []
    data["used_fabrics"] = []
    for link in item.fabric_links:
        fabric = serialize_request(link.fabric)
        fabric.update({"link_id": link.id, "usage_status": link.usage_status, "usage_note": link.note})
        data["used_fabrics"].append(fabric)
    history = []
    for event in sorted(item.events, key=lambda e: e.started_at):
        seconds = ((event.ended_at or utcnow()) - event.started_at).total_seconds()
        history.append({
            "id": event.id,
            "stage": event.stage,
            "status": event.status,
            "started_at": event.started_at,
            "ended_at": event.ended_at,
            "days": round(seconds / 86400, 1),
            "note": event.note,
            "responsible_name": event.responsible_name,
            "supplier_name": None,
        })
    # ProduÃ§Ãµes antigas (importadas antes do histÃ³rico) nÃ£o tÃªm eventos: mostra a fase
    # atual como em curso a partir da criaÃ§Ã£o, sem persistir nada.
    if not history and item.status != "cancelada":
        seconds = (utcnow() - item.created_at).total_seconds()
        history.append({
            "id": 0, "stage": item.status, "status": "active",
            "started_at": item.created_at, "ended_at": None,
            "days": round(seconds / 86400, 1), "note": None,
            "responsible_name": item.responsible_name, "supplier_name": None,
        })
    data["stage_history"] = history
    data["comments"] = [
        {"id": c.id, "author": c.author, "body": c.body, "category": c.category, "created_at": c.created_at}
        for c in sorted(item.comments, key=lambda c: c.created_at, reverse=True)
    ]
    return data


@router.get("")
def get_productions(db: Session = Depends(get_db)):
    stmt = select(Production).options(*LOAD_OPTIONS).order_by(Production.created_at.desc())
    return {
        "stages": PRODUCTION_STAGES,
        "items": [serialize_production(item) for item in db.scalars(stmt).unique().all()],
    }


@router.get("/{production_id}")
def get_production(production_id: int, db: Session = Depends(get_db)):
    item = load_by_id(db, production_id)
    if not item:
        raise HTTPException(status_code=404, detail="ProduÃ§Ã£o nÃ£o encontrada")
    return serialize_detail(item, db)


@router.post("", status_code=201)
def post_production(payload: ProductionCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    status = data.pop("status", None) or "encomenda_recebida"
    if status not in PRODUCTION_STAGES:
        raise HTTPException(status_code=422, detail="Estado de produÃ§Ã£o invÃ¡lido")
    if payload.development_id:
        if not db.get(Development, payload.development_id):
            raise HTTPException(status_code=404, detail="Desenvolvimento nÃ£o encontrado")
    elif not (payload.title and payload.client_id):
        raise HTTPException(status_code=422, detail="Indique um desenvolvimento, ou tÃ­tulo + cliente.")
    if payload.client_id and not db.get(Client, payload.client_id):
        raise HTTPException(status_code=404, detail="Cliente nÃ£o encontrado")
    item = Production(**data)
    item.status = status
    db.add(item)
    db.flush()
    db.add(ProductionEvent(production_id=item.id, stage=status, status="active", responsible_name=item.responsible_name))
    db.commit()
    return {"id": item.id, "status": item.status}


@router.patch("/{production_id}")
def patch_production(production_id: int, payload: ProductionUpdate, db: Session = Depends(get_db)):
    item = load_by_id(db, production_id)
    if not item:
        raise HTTPException(status_code=404, detail="ProduÃ§Ã£o nÃ£o encontrada")
    data = payload.model_dump(exclude_unset=True)
    new_status = data.get("status")
    if new_status and new_status not in PRODUCTION_STAGES:
        raise HTTPException(status_code=422, detail="Estado de produÃ§Ã£o invÃ¡lido")
    # Ao mudar de fase, fecha o evento ativo e abre um novo â€” regista o tempo em cada fase.
    if new_status and new_status != item.status:
        now = utcnow()
        for event in item.events:
            if event.status == "active" and event.ended_at is None:
                event.status = "completed"
                event.ended_at = now
        # Reaproveita uma nota antecipada (fase planeada) em vez de duplicar a fase.
        planned = next((e for e in item.events if e.stage == new_status and e.status == "planned"), None)
        if planned:
            planned.status = "active"
            planned.started_at = now
            planned.ended_at = None
        else:
            db.add(ProductionEvent(production_id=item.id, stage=new_status, status="active", started_at=now, responsible_name=item.responsible_name))
    for key, value in data.items():
        setattr(item, key, value)
    db.commit()
    db.expire_all()  # força recarregar relações (ex.: development após mudar development_id)
    return serialize_detail(load_by_id(db, production_id), db)


@router.put("/{production_id}/stage-notes")
def upsert_stage_note(production_id: int, payload: StageNoteUpsert, db: Session = Depends(get_db)):
    item = load_by_id(db, production_id)
    if not item:
        raise HTTPException(status_code=404, detail="ProduÃ§Ã£o nÃ£o encontrada")
    if payload.stage not in PRODUCTION_STAGES:
        raise HTTPException(status_code=422, detail="Fase invÃ¡lida")
    # Escreve a nota na fase; se ainda nÃ£o foi percorrida, cria um marcador planeado.
    events = [e for e in item.events if e.stage == payload.stage]
    if events:
        max(events, key=lambda e: e.started_at).note = payload.note
    else:
        db.add(ProductionEvent(production_id=item.id, stage=payload.stage, status="planned", ended_at=None, note=payload.note, responsible_name=item.responsible_name))
    db.commit()
    return serialize_detail(load_by_id(db, production_id), db)


@router.post("/{production_id}/comments", status_code=201)
def add_comment(production_id: int, payload: CommentCreate, db: Session = Depends(get_db)):
    if not db.get(Production, production_id):
        raise HTTPException(status_code=404, detail="ProduÃ§Ã£o nÃ£o encontrada")
    db.add(Comment(production_id=production_id, author=payload.author, body=payload.body, category=payload.category))
    db.commit()
    return {"ok": True}


@router.post("/{production_id}/fabrics", status_code=201)
def add_fabric_usage(production_id: int, payload: FabricUsageCreate, db: Session = Depends(get_db)):
    if not db.get(Production, production_id) or not db.get(FabricRequest, payload.fabric_request_id):
        raise HTTPException(status_code=404, detail="Produção ou malha não encontrada")
    if payload.usage_status not in USAGE_STATUSES:
        raise HTTPException(status_code=422, detail="Estado de utilização inválido")
    link = db.scalar(select(ProductionFabricLink).where(
        ProductionFabricLink.production_id == production_id,
        ProductionFabricLink.fabric_request_id == payload.fabric_request_id,
    ))
    if link:
        link.usage_status, link.note = payload.usage_status, payload.note
    else:
        db.add(ProductionFabricLink(production_id=production_id, **payload.model_dump()))
    db.commit()
    return serialize_detail(load_by_id(db, production_id), db)


@router.patch("/{production_id}/fabrics/{link_id}")
def update_fabric_usage(production_id: int, link_id: int, payload: FabricUsageUpdate, db: Session = Depends(get_db)):
    link = db.get(ProductionFabricLink, link_id)
    if not link or link.production_id != production_id:
        raise HTTPException(status_code=404, detail="Utilização de malha não encontrada")
    data = payload.model_dump(exclude_unset=True)
    if "usage_status" in data and data["usage_status"] not in USAGE_STATUSES:
        raise HTTPException(status_code=422, detail="Estado de utilização inválido")
    for key, value in data.items():
        setattr(link, key, value)
    db.commit()
    return serialize_detail(load_by_id(db, production_id), db)


@router.delete("/{production_id}/fabrics/{link_id}", status_code=204)
def remove_fabric_usage(production_id: int, link_id: int, db: Session = Depends(get_db)):
    link = db.get(ProductionFabricLink, link_id)
    if not link or link.production_id != production_id:
        raise HTTPException(status_code=404, detail="Utilização de malha não encontrada")
    db.delete(link)
    db.commit()


@router.delete("/{production_id}", status_code=204)
def delete_production(production_id: int, db: Session = Depends(get_db)):
    item = db.get(Production, production_id)
    if not item:
        raise HTTPException(status_code=404, detail="ProduÃ§Ã£o nÃ£o encontrada")
    db.delete(item)
    db.commit()
