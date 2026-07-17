from sqlalchemy.orm import Session
from app.core.timeutil import utcnow
from app.services.analytics.stage_stats import average_stage_durations, estimate_completion
from app.services.development.serialize_development import serialize_development


def serialize_detail(db: Session, development) -> dict:
    data = serialize_development(development)
    history = []
    for event in sorted(development.stage_events, key=lambda item: item.started_at):
        seconds = ((event.ended_at or utcnow()) - event.started_at).total_seconds()
        history.append({
            "stage": event.stage,
            "status": event.status,
            "started_at": event.started_at,
            "ended_at": event.ended_at,
            "days": round(seconds / 86400, 1),
            "note": event.note,
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
    return data
