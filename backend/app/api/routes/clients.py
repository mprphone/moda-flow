from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.client import Client
from app.models.production import Production
from app.repositories.client_repository import list_all
from app.schemas.client import ClientCreate, ClientUpdate
from app.services.scoring.client_score import calculate_client_score

router = APIRouter()


def serialize_client(item) -> dict:
    return {
        "id": item.id, "name": item.name, "code": item.code, "group_name": item.group_name,
        "email": item.email, "phone": item.phone, "contact_person": item.contact_person,
        "segments": item.segments, "preferred_channel": item.preferred_channel,
        "meetings": item.meetings, "notes": item.notes,
    }


@router.get("")
def get_clients(db: Session = Depends(get_db)):
    return [serialize_client(item) for item in list_all(db)]


@router.post("", status_code=201)
def post_client(payload: ClientCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if db.scalar(select(Client).where(func.lower(Client.name) == name.lower())):
        raise HTTPException(status_code=409, detail="Já existe um cliente com esse nome.")
    item = Client(**{**payload.model_dump(), "name": name})
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize_client(item)


@router.patch("/{client_id}")
def patch_client(client_id: int, payload: ClientUpdate, db: Session = Depends(get_db)):
    item = db.get(Client, client_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    data = payload.model_dump(exclude_unset=True)
    if data.get("name"):
        data["name"] = data["name"].strip()
        duplicate = db.scalar(select(Client).where(func.lower(Client.name) == data["name"].lower(), Client.id != client_id))
        if duplicate:
            raise HTTPException(status_code=409, detail="Já existe um cliente com esse nome.")
    for key, value in data.items():
        setattr(item, key, value)
    db.commit(); db.refresh(item)
    return serialize_client(item)


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, db: Session = Depends(get_db)):
    item = db.get(Client, client_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    productions = db.scalar(select(func.count()).select_from(Production).where(Production.client_id == client_id)) or 0
    if item.developments or productions:
        raise HTTPException(status_code=409, detail=f"Não é possível eliminar: existem {len(item.developments)} desenvolvimentos e {productions} produções ligadas a este cliente.")
    db.delete(item); db.commit()


@router.get("/scores")
def get_client_scores(db: Session = Depends(get_db)):
    return [calculate_client_score(db, item) for item in list_all(db)]
