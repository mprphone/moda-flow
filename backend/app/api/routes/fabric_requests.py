from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.core.db import get_db
from app.core.timeutil import today
from app.models.fabric_request import FABRIC_STATUSES, FabricRequest
from app.schemas.common import ORMModel
from app.services.fabrics.serialize_request import serialize_request

router = APIRouter()


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


class FabricRequestUpdate(FabricRequestCreate):
    reference: str | None = None
    status: str | None = None
    received_at: date | None = None


@router.get("")
def get_fabric_requests(db: Session = Depends(get_db)):
    stmt = (
        select(FabricRequest)
        .options(joinedload(FabricRequest.supplier), joinedload(FabricRequest.development))
        .order_by(FabricRequest.requested_at.desc(), FabricRequest.id.desc())
    )
    return {"statuses": FABRIC_STATUSES, "items": [serialize_request(item) for item in db.scalars(stmt).unique().all()]}


@router.post("", status_code=201)
def post_fabric_request(payload: FabricRequestCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    if data.get("requested_at") is None:
        data["requested_at"] = today()
    item = FabricRequest(**data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize_request(item)


@router.patch("/{request_id}")
def patch_fabric_request(request_id: int, payload: FabricRequestUpdate, db: Session = Depends(get_db)):
    item = db.get(FabricRequest, request_id)
    if not item:
        raise HTTPException(status_code=404, detail="Pedido de malha não encontrado")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data:
        if data["status"] not in FABRIC_STATUSES:
            raise HTTPException(status_code=422, detail="Estado inválido")
        # Ao marcar como recebida, regista automaticamente a data de receção.
        if data["status"] in {"recebida", "tingimento"} and not item.received_at and "received_at" not in data:
            data["received_at"] = today()
    for key, value in data.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return serialize_request(item)


@router.delete("/{request_id}", status_code=204)
def delete_fabric_request(request_id: int, db: Session = Depends(get_db)):
    item = db.get(FabricRequest, request_id)
    if not item:
        raise HTTPException(status_code=404, detail="Pedido de malha não encontrado")
    db.delete(item)
    db.commit()
