from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.label import Label
from app.schemas.common import ORMModel

router = APIRouter()


class LabelCreate(ORMModel):
    name: str
    tone: str = "lilac"


def serialize_label(label: Label) -> dict:
    return {"id": label.id, "name": label.name, "tone": label.tone}


@router.get("")
def get_labels(db: Session = Depends(get_db)):
    return [serialize_label(item) for item in db.scalars(select(Label).order_by(Label.name)).all()]


@router.post("", status_code=201)
def post_label(payload: LabelCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Label).where(Label.name == payload.name.strip())):
        raise HTTPException(status_code=409, detail="Já existe uma etiqueta com esse nome.")
    label = Label(name=payload.name.strip(), tone=payload.tone)
    db.add(label)
    db.commit()
    db.refresh(label)
    return serialize_label(label)
