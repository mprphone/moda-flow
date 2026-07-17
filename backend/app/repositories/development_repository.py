from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload
from app.models.development import Development

LIST_OPTIONS = (
    joinedload(Development.client),
    selectinload(Development.stage_events),
    selectinload(Development.productions),
    selectinload(Development.labels),
    selectinload(Development.comments),
)


def list_all(db: Session) -> list[Development]:
    stmt = select(Development).options(*LIST_OPTIONS).order_by(Development.updated_at.desc())
    return list(db.scalars(stmt).unique().all())


def get_by_id(db: Session, development_id: int) -> Development | None:
    stmt = select(Development).where(Development.id == development_id).options(*LIST_OPTIONS)
    return db.scalars(stmt).unique().first()


def create(db: Session, development: Development) -> Development:
    db.add(development)
    db.flush()
    db.refresh(development)
    return development
