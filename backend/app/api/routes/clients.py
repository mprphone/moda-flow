from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.client import Client
from app.repositories.client_repository import list_all
from app.schemas.client import ClientCreate
from app.services.scoring.client_score import calculate_client_score

router = APIRouter()


@router.get("")
def get_clients(db: Session = Depends(get_db)):
    return [{"id": item.id, "name": item.name, "group_name": item.group_name, "notes": item.notes} for item in list_all(db)]


@router.post("", status_code=201)
def post_client(payload: ClientCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if db.scalar(select(Client).where(func.lower(Client.name) == name.lower())):
        raise HTTPException(status_code=409, detail="Já existe um cliente com esse nome.")
    item = Client(**{**payload.model_dump(), "name": name})
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/scores")
def get_client_scores(db: Session = Depends(get_db)):
    return [calculate_client_score(db, item) for item in list_all(db)]
