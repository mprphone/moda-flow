from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.client import Client


def list_all(db: Session) -> list[Client]:
    return list(db.scalars(select(Client).order_by(Client.name)).all())


def get_by_id(db: Session, client_id: int) -> Client | None:
    return db.get(Client, client_id)
