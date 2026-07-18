from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.comment import Comment
from app.models.fabric_request import FabricRequest
from app.models.label import Label
from app.models.stage_event import StageEvent
from app.repositories.development_repository import list_all, get_by_id
from app.schemas.development import CommentCreate, DevelopmentCreate, DevelopmentMove, QuickUpdate, StageNoteUpdate
from app.services.development.create_development import create_development
from app.services.development.serialize_development import serialize_development
from app.services.development.serialize_detail import serialize_detail
from app.services.pipeline.move_stage import move_development

router = APIRouter()


@router.get("")
def get_developments(db: Session = Depends(get_db)):
    return [serialize_development(item) for item in list_all(db)]


@router.post("", status_code=201)
def post_development(payload: DevelopmentCreate, db: Session = Depends(get_db)):
    return serialize_development(create_development(db, payload))


@router.get("/{development_id}")
def get_development(development_id: int, db: Session = Depends(get_db)):
    item = get_by_id(db, development_id)
    if not item:
        raise HTTPException(status_code=404, detail="Desenvolvimento não encontrado")
    return serialize_detail(db, item)


@router.post("/{development_id}/move")
def post_move(development_id: int, payload: DevelopmentMove, db: Session = Depends(get_db)):
    move_development(db, development_id, payload)
    return serialize_development(get_by_id(db, development_id))


@router.patch("/{development_id}")
def patch_development(development_id: int, payload: QuickUpdate, db: Session = Depends(get_db)):
    item = get_by_id(db, development_id)
    if not item:
        raise HTTPException(status_code=404, detail="Desenvolvimento não encontrado")
    data = payload.model_dump(exclude_unset=True)
    label_ids = data.pop("label_ids", None)
    if label_ids is not None:
        item.labels = list(db.scalars(select(Label).where(Label.id.in_(label_ids))).all())
    for key, value in data.items():
        setattr(item, key, value)
    db.commit()
    return serialize_development(get_by_id(db, development_id))


@router.delete("/{development_id}", status_code=204)
def delete_development(development_id: int, db: Session = Depends(get_db)):
    item = get_by_id(db, development_id)
    if not item:
        raise HTTPException(status_code=404, detail="Desenvolvimento não encontrado")
    if item.productions:
        raise HTTPException(status_code=409, detail="Tem produções associadas. Cancele o desenvolvimento em vez de o apagar.")
    for purchase in item.shopping:
        purchase.development_id = None
    for fabric in db.scalars(select(FabricRequest).where(FabricRequest.development_id == development_id)).all():
        fabric.development_id = None
    db.delete(item)
    db.commit()


@router.patch("/{development_id}/stages/{event_id}")
def update_stage_note(development_id: int, event_id: int, payload: StageNoteUpdate, db: Session = Depends(get_db)):
    event = db.get(StageEvent, event_id)
    if not event or event.development_id != development_id:
        raise HTTPException(status_code=404, detail="Fase não encontrada")
    event.note = payload.note
    db.commit()
    return serialize_detail(db, get_by_id(db, development_id))


@router.post("/{development_id}/comments", status_code=201)
def add_comment(development_id: int, payload: CommentCreate, db: Session = Depends(get_db)):
    if not get_by_id(db, development_id):
        raise HTTPException(status_code=404, detail="Desenvolvimento não encontrado")
    comment = Comment(
        development_id=development_id,
        author=payload.author,
        body=payload.body,
        category=payload.category,
    )
    db.add(comment)
    db.commit()
    return {"ok": True}
