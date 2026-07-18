import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.enums import PIPELINE
from app.core.timeutil import utcnow
from app.models.comment import Comment
from app.models.fabric_request import FabricRequest
from app.models.label import Label
from app.models.development import DevelopmentAssignee, DevelopmentTask
from app.models.user import User
from app.models.stage_event import StageEvent
from app.repositories.development_repository import list_all, get_by_id
from app.schemas.development import AssigneeCreate, CommentCreate, DevelopmentCreate, DevelopmentMove, QuickUpdate, StageNoteUpdate, StageNoteUpsert, TaskCreate, TaskUpdate
from app.services.development.create_development import create_development
from app.services.development.serialize_development import serialize_development
from app.services.development.serialize_detail import serialize_detail
from app.services.pipeline.move_stage import move_development

router = APIRouter()

TASK_KINDS = {
    "ficha", "malha", "tingimento", "grafico_bordado", "bordado", "aplicacao",
    "acessorios", "peca_shopping", "shopping_modelagem", "envio_cliente", "resposta_cliente",
}
TASK_STATUSES = {"pending", "in_progress", "waiting", "done", "cancelled"}
ASSIGNEE_ROLES = {"principal", "parceria", "fitting", "qualidade", "grafico"}


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
    images = data.pop("images", None)
    if images is not None:
        item.images_json = json.dumps(list(dict.fromkeys(images)))
    if label_ids is not None:
        item.labels = list(db.scalars(select(Label).where(Label.id.in_(label_ids))).all())
    for key, value in data.items():
        setattr(item, key, value)
    db.commit()
    return serialize_development(get_by_id(db, development_id))


@router.post("/{development_id}/assignees", status_code=201)
def add_assignee(development_id: int, payload: AssigneeCreate, db: Session = Depends(get_db)):
    if not get_by_id(db, development_id):
        raise HTTPException(status_code=404, detail="Desenvolvimento não encontrado")
    if payload.role not in ASSIGNEE_ROLES:
        raise HTTPException(status_code=422, detail="Função inválida")
    if not db.get(User, payload.user_id):
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    exists = db.scalar(select(DevelopmentAssignee).where(
        DevelopmentAssignee.development_id == development_id,
        DevelopmentAssignee.user_id == payload.user_id,
        DevelopmentAssignee.role == payload.role,
    ))
    if exists:
        raise HTTPException(status_code=409, detail="Esta pessoa já tem essa função")
    db.add(DevelopmentAssignee(development_id=development_id, user_id=payload.user_id, role=payload.role))
    db.commit()
    return serialize_development(get_by_id(db, development_id))


@router.delete("/{development_id}/assignees/{assignee_id}", status_code=204)
def remove_assignee(development_id: int, assignee_id: int, db: Session = Depends(get_db)):
    item = db.get(DevelopmentAssignee, assignee_id)
    if not item or item.development_id != development_id:
        raise HTTPException(status_code=404, detail="Responsável não encontrado")
    db.delete(item)
    db.commit()


@router.post("/{development_id}/tasks", status_code=201)
def add_task(development_id: int, payload: TaskCreate, db: Session = Depends(get_db)):
    if not get_by_id(db, development_id):
        raise HTTPException(status_code=404, detail="Desenvolvimento não encontrado")
    if payload.kind not in TASK_KINDS or payload.status not in TASK_STATUSES:
        raise HTTPException(status_code=422, detail="Tipo ou estado de pendência inválido")
    if payload.responsible_user_id and not db.get(User, payload.responsible_user_id):
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    task = DevelopmentTask(**payload.model_dump(), development_id=development_id)
    if task.status == "done":
        task.completed_at = utcnow()
    db.add(task)
    db.commit()
    return serialize_development(get_by_id(db, development_id))


@router.patch("/{development_id}/tasks/{task_id}")
def update_task(development_id: int, task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.get(DevelopmentTask, task_id)
    if not task or task.development_id != development_id:
        raise HTTPException(status_code=404, detail="Pendência não encontrada")
    data = payload.model_dump(exclude_unset=True)
    if data.get("status") and data["status"] not in TASK_STATUSES:
        raise HTTPException(status_code=422, detail="Estado de pendência inválido")
    if data.get("responsible_user_id") and not db.get(User, data["responsible_user_id"]):
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    if "status" in data:
        task.completed_at = utcnow() if data["status"] == "done" else None
    for key, value in data.items():
        setattr(task, key, value)
    db.commit()
    return serialize_development(get_by_id(db, development_id))


@router.delete("/{development_id}/tasks/{task_id}", status_code=204)
def remove_task(development_id: int, task_id: int, db: Session = Depends(get_db)):
    task = db.get(DevelopmentTask, task_id)
    if not task or task.development_id != development_id:
        raise HTTPException(status_code=404, detail="Pendência não encontrada")
    db.delete(task)
    db.commit()


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


@router.put("/{development_id}/stage-notes")
def upsert_stage_note(development_id: int, payload: StageNoteUpsert, db: Session = Depends(get_db)):
    development = get_by_id(db, development_id)
    if not development:
        raise HTTPException(status_code=404, detail="Desenvolvimento não encontrado")
    if payload.stage not in PIPELINE:
        raise HTTPException(status_code=422, detail="Fase inválida")
    events = [e for e in development.stage_events if e.stage == payload.stage]
    if events:
        max(events, key=lambda e: e.started_at).note = payload.note
    else:
        db.add(StageEvent(development_id=development.id, stage=payload.stage, status="planned", ended_at=None, note=payload.note, responsible_name=development.owner_name))
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
