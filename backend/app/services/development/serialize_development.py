import json
from app.models.development import Development
from app.services.pipeline.next_action import get_next_action
from app.services.pipeline.timing import days_in_current_stage
from app.services.suggestions.development_suggestions import build_suggestions, risk_from_suggestions


def serialize_development(development: Development) -> dict:
    suggestions = build_suggestions(development)
    active_tasks = [task for task in development.tasks if task.status != "done"]
    images = json.loads(development.images_json or "[]")
    if development.cover_url and development.cover_url not in images:
        images.insert(0, development.cover_url)
    return {
        "id": development.id,
        "code": development.code,
        "title": development.title,
        "client_id": development.client_id,
        "client_name": development.client.name,
        "owner_name": development.owner_name,
        "cover_url": development.cover_url,
        "images": images,
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
        "assignees": [
            {"id": item.id, "user_id": item.user_id, "name": item.user.name, "role": item.role}
            for item in development.assignees
        ],
        "tasks": [
            {
                "id": task.id, "kind": task.kind, "status": task.status, "note": task.note,
                "due_date": task.due_date, "responsible_user_id": task.responsible_user_id,
                "responsible_name": task.responsible.name if task.responsible else None,
                "completed_at": task.completed_at,
            }
            for task in sorted(development.tasks, key=lambda task: (task.status == "done", task.created_at))
        ],
        "open_tasks_count": len(active_tasks),
    }
