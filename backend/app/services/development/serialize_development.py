from app.models.development import Development
from app.services.pipeline.next_action import get_next_action
from app.services.pipeline.timing import days_in_current_stage
from app.services.suggestions.development_suggestions import build_suggestions, risk_from_suggestions


def serialize_development(development: Development) -> dict:
    suggestions = build_suggestions(development)
    return {
        "id": development.id,
        "code": development.code,
        "title": development.title,
        "client_id": development.client_id,
        "client_name": development.client.name,
        "owner_name": development.owner_name,
        "cover_url": development.cover_url,
        "current_stage": development.current_stage,
        "status": development.status,
        "waiting_reason": development.waiting_reason,
        "description": development.description,
        "due_date": development.due_date,
        "estimated_value": float(development.estimated_value) if development.estimated_value is not None else None,
        "created_at": development.created_at,
        "updated_at": development.updated_at,
        "days_in_stage": days_in_current_stage(development),
        "next_action": get_next_action(development),
        "risk": risk_from_suggestions(suggestions),
        "suggestions": suggestions,
        "labels": [{"id": label.id, "name": label.name, "tone": label.tone} for label in development.labels],
        "comments_count": len(development.comments),
    }
