from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.core.enums import PIPELINE, DevelopmentStatus, Stage
from app.core.timeutil import utcnow
from app.models.stage_event import StageEvent
from app.repositories.development_repository import get_by_id
from app.schemas.development import DevelopmentMove

STATUS_LABELS = {
    DevelopmentStatus.WAITING_SUPPLIER.value: "aguardava fornecedor",
    DevelopmentStatus.WAITING_CLIENT.value: "aguardava cliente",
    DevelopmentStatus.BLOCKED.value: "estava bloqueado",
}


def move_development(db: Session, development_id: int, payload: DevelopmentMove):
    development = get_by_id(db, development_id)
    if not development:
        raise HTTPException(status_code=404, detail="Desenvolvimento não encontrado")
    if payload.to_stage not in PIPELINE:
        raise HTTPException(status_code=422, detail="Fase inválida")

    now = utcnow()
    # Preserva no histórico o estado de espera/bloqueio que existia antes do movimento.
    closing_note = None
    if development.status in STATUS_LABELS:
        closing_note = f"Ao sair, {STATUS_LABELS[development.status]}" + (
            f": {development.waiting_reason}" if development.waiting_reason else "."
        )
    if not payload.keep_previous_active:
        for event in development.stage_events:
            if event.status == "active" and event.ended_at is None:
                event.status = "completed"
                event.ended_at = now
                if closing_note:
                    event.note = f"{event.note} | {closing_note}" if event.note else closing_note

    # Reaproveita uma nota antecipada (fase planeada) em vez de duplicar a fase.
    planned = next((e for e in development.stage_events if e.stage == payload.to_stage and e.status == "planned"), None)
    if planned:
        planned.status = "active"
        planned.started_at = now
        planned.ended_at = None
        if payload.note:
            planned.note = payload.note
        if payload.supplier_id:
            planned.supplier_id = payload.supplier_id
        planned.responsible_name = payload.responsible_name or development.owner_name
    else:
        db.add(StageEvent(
            development_id=development.id,
            stage=payload.to_stage,
            status="active",
            started_at=now,
            note=payload.note,
            supplier_id=payload.supplier_id,
            responsible_name=payload.responsible_name or development.owner_name,
        ))
    development.current_stage = payload.to_stage
    development.updated_at = now
    development.status = DevelopmentStatus.COMPLETED.value if payload.to_stage == Stage.APROVADO.value else DevelopmentStatus.ACTIVE.value
    development.waiting_reason = None
    db.commit()
    db.refresh(development)
    return development
