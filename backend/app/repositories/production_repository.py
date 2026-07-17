from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.models.production import Production


def list_all(db: Session) -> list[Production]:
    stmt = select(Production).options(joinedload(Production.development).joinedload("client")).order_by(Production.created_at.desc())
    return list(db.scalars(stmt).unique().all())
