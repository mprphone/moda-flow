from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.core.timeutil import utcnow
from app.models.fabric_request import FabricRequest
from app.services.analytics.stage_stats import average_stage_durations, estimate_completion
from app.services.development.serialize_development import serialize_development
from app.services.fabrics.serialize_request import serialize_request


def serialize_detail(db: Session, development) -> dict:
    data = serialize_development(development)
    history = []
    for event in sorted(development.stage_events, key=lambda item: item.started_at):
        seconds = ((event.ended_at or utcnow()) - event.started_at).total_seconds()
        history.append({
            "id": event.id,
            "stage": event.stage,
            "status": event.status,
            "started_at": event.started_at,
            "ended_at": event.ended_at,
            "days": round(seconds / 86400, 1),
            "note": event.note,
            "responsible_name": event.responsible_name,
            "supplier_name": event.supplier.name if event.supplier else None,
        })
    data["stage_history"] = history
    eta = estimate_completion(development, average_stage_durations(db))
    data["estimated_completion"] = eta
    data["eta_at_risk"] = bool(eta and development.due_date and eta > development.due_date)
    data["comments"] = [
        {"id": c.id, "author": c.author, "body": c.body, "category": c.category, "created_at": c.created_at}
        for c in sorted(development.comments, key=lambda c: c.created_at, reverse=True)
    ]
    fabric_stmt = (
        select(FabricRequest)
        .where(FabricRequest.development_id == development.id)
        .options(joinedload(FabricRequest.supplier), joinedload(FabricRequest.development))
        .order_by(FabricRequest.requested_at.desc())
    )
    data["fabric_requests"] = [serialize_request(item) for item in db.scalars(fabric_stmt).unique().all()]
    productions = []
    for p in development.productions:
        history = []
        for event in sorted(p.events, key=lambda e: e.started_at):
            seconds = ((event.ended_at or utcnow()) - event.started_at).total_seconds()
            history.append({
                "id": event.id, "stage": event.stage, "status": event.status,
                "started_at": event.started_at, "ended_at": event.ended_at,
                "days": round(seconds / 86400, 1), "note": event.note,
                "responsible_name": event.responsible_name, "supplier_name": None,
            })
        productions.append({
            "id": p.id, "status": p.status, "quantity": p.quantity, "due_date": p.due_date,
            "title": p.title, "created_at": p.created_at, "stage_history": history,
        })
    data["productions"] = productions
    return data
