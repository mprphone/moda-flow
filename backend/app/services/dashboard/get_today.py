from datetime import timedelta
from sqlalchemy.orm import Session
from app.core.enums import DevelopmentStatus, Stage
from app.core.timeutil import today
from app.repositories.development_repository import list_all as list_developments
from app.repositories.shopping_repository import list_all as list_shopping
from app.services.development.serialize_development import serialize_development
from app.services.shopping.auto_transitions import apply_auto_transitions
from app.services.shopping.serialize_purchase import serialize_purchase


def priority_score(data: dict) -> int:
    """Pontuação única que ordena o dia: prazo, risco, bloqueios e valor."""
    score = {"high": 40, "medium": 20}.get(data["risk"], 0)
    if data["due_date"]:
        remaining = (data["due_date"] - today()).days
        if remaining < 0:
            score += 50 + min(20, -remaining * 2)
        elif remaining <= 3:
            score += 30
        elif remaining <= 7:
            score += 15
    if data["status"] == DevelopmentStatus.BLOCKED.value:
        score += 25
    elif data["status"].startswith("waiting"):
        score += 10
    score += min(15, int(data["days_in_stage"]))
    if data["estimated_value"]:
        score += min(10, int(data["estimated_value"] / 1000))
    return score


def get_today_dashboard(db: Session) -> dict:
    developments = list_developments(db)
    shopping = list_shopping(db)
    apply_auto_transitions(db, shopping)

    serialized = [serialize_development(item) for item in developments]
    closed_statuses = {DevelopmentStatus.CANCELLED.value, DevelopmentStatus.REJECTED.value, DevelopmentStatus.COMPLETED.value}
    open_items = [
        item for item in serialized
        if item["current_stage"] != Stage.APROVADO.value and item["status"] not in closed_statuses
    ]
    for item in open_items:
        item["priority"] = priority_score(item)
    priorities = sorted([item for item in open_items if item["priority"] > 0], key=lambda i: i["priority"], reverse=True)[:8]

    overdue = [item for item in open_items if item["due_date"] and item["due_date"] < today()]
    shopping_alerts = [
        item for item in shopping
        if item.return_deadline and item.return_deadline <= today() + timedelta(days=3) and item.status not in {"returned", "closed"}
    ][:8]
    return {
        "overdue_count": len(overdue),
        "blocked_count": sum(1 for item in open_items if item["status"] == DevelopmentStatus.BLOCKED.value),
        "waiting_supplier_count": sum(1 for item in open_items if item["status"] == DevelopmentStatus.WAITING_SUPPLIER.value),
        "waiting_client_count": sum(1 for item in open_items if item["status"] == DevelopmentStatus.WAITING_CLIENT.value),
        "shopping_deadline_count": len(shopping_alerts),
        "priorities": priorities,
        "shopping_alerts": [serialize_purchase(item) for item in shopping_alerts],
    }
