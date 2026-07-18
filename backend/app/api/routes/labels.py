from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.label import Label
from app.schemas.common import ORMModel

router = APIRouter()

SCOPES = {"development", "fabric"}


class LabelCreate(ORMModel):
    name: str
    tone: str = "lilac"
    scope: str = "development"


def serialize_label(label: Label) -> dict:
    return {"id": label.id, "name": label.name, "tone": label.tone, "scope": label.scope}


@router.get("")
def get_labels(scope: str = "development", db: Session = Depends(get_db)):
    stmt = select(Label).where(Label.scope == scope).order_by(Label.name)
    return [serialize_label(item) for item in db.scalars(stmt).all()]


@router.post("", status_code=201)
def post_label(payload: LabelCreate, db: Session = Depends(get_db)):
    if payload.scope not in SCOPES:
        raise HTTPException(status_code=422, detail="Âmbito de etiqueta inválido.")
    name = payload.name.strip()
    if db.scalar(select(Label).where(Label.name == name)):
        raise HTTPException(status_code=409, detail="Já existe uma etiqueta com esse nome.")
    label = Label(name=name, tone=payload.tone, scope=payload.scope)
    db.add(label)
    db.commit()
    db.refresh(label)
    return serialize_label(label)
