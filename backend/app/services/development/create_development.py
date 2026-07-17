from sqlalchemy.orm import Session
from app.core.timeutil import utcnow
from app.models.development import Development
from app.models.stage_event import StageEvent
from app.repositories.development_repository import create
from app.schemas.development import DevelopmentCreate


def create_development(db: Session, payload: DevelopmentCreate) -> Development:
    development = Development(**payload.model_dump())
    create(db, development)
    db.add(StageEvent(
        development_id=development.id,
        stage=development.current_stage,
        status="active",
        started_at=utcnow(),
        responsible_name=development.owner_name,
    ))
    db.commit()
    db.refresh(development)
    return development
