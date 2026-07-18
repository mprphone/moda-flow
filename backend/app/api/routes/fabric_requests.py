from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload
from app.core.db import get_db
from app.core.timeutil import today
from app.models.fabric_request import FABRIC_STATUSES, FabricRequest
from app.models.label import Label
from app.schemas.common import ORMModel
from app.services.fabrics.serialize_request import serialize_request

router = APIRouter()

LOAD_OPTIONS = (
    joinedload(FabricRequest.supplier),
    joinedload(FabricRequest.development),
    selectinload(FabricRequest.labels),
)


class FabricRequestCreate(ORMModel):
    reference: str
    article: str | None = None
    composition: str | None = None
    width: str | None = None
    grammage: str | None = None
    color: str | None = None
    quantity_meters: float | None = None
    price_per_meter: float | None = None
    leadtime: str | None = None
    notes: str | None = None
    cover_url: str | None = None
    supplier_id: int | None = None
    development_id: int | None = None
    requested_at: date | None = None
    label_ids: list[int] | None = None


class FabricRequestUpdate(FabricRequestCreate):
    reference: str | None = None
    status: str | None = None
    received_at: date | None = None


def load_by_id(db: Session, request_id: int) -> FabricRequest | None:
    stmt = select(FabricRequest).where(FabricRequest.id == request_id).options(*LOAD_OPTIONS)
    return db.scalars(stmt).unique().first()


@router.get("")
def get_fabric_requests(db: Session = Depends(get_db)):
    stmt = select(FabricRequest).options(*LOAD_OPTIONS).order_by(FabricRequest.requested_at.desc(), FabricRequest.id.desc())
    return {"statuses": FABRIC_STATUSES, "items": [serialize_request(item) for item in db.scalars(stmt).unique().all()]}


@router.post("", status_code=201)
def post_fabric_request(payload: FabricRequestCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    label_ids = data.pop("label_ids", None)
    if data.get("requested_at") is None:
        data["requested_at"] = today()
    item = FabricRequest(**data)
    if label_ids:
        item.labels = list(db.scalars(select(Label).where(Label.id.in_(label_ids))).all())
    db.add(item)
    db.commit()
    return serialize_request(load_by_id(db, item.id))


@router.patch("/{request_id}")
def patch_fabric_request(request_id: int, payload: FabricRequestUpdate, db: Session = Depends(get_db)):
    item = load_by_id(db, request_id)
    if not item:
        raise HTTPException(status_code=404, detail="Pedido de malha não encontrado")
    data = payload.model_dump(exclude_unset=True)
    label_ids = data.pop("label_ids", None)
    if label_ids is not None:
        item.labels = list(db.scalars(select(Label).where(Label.id.in_(label_ids))).all())
    if "status" in data:
        if data["status"] not in FABRIC_STATUSES:
            raise HTTPException(status_code=422, detail="Estado inválido")
        # Ao marcar como recebida, regista automaticamente a data de receção.
        if data["status"] in {"recebida", "tingimento"} and not item.received_at and "received_at" not in data:
            data["received_at"] = today()
    for key, value in data.items():
        setattr(item, key, value)
    db.commit()
    return serialize_request(load_by_id(db, request_id))


@router.delete("/{request_id}", status_code=204)
def delete_fabric_request(request_id: int, db: Session = Depends(get_db)):
    item = db.get(FabricRequest, request_id)
    if not item:
        raise HTTPException(status_code=404, detail="Pedido de malha não encontrado")
    db.delete(item)
    db.commit()
