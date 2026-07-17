from sqlalchemy.orm import Session
from app.core.enums import Stage
from app.models.client import Client
from app.services.scoring.tastes import taste_keywords

CLOSED = {"cancelled", "rejected"}


def calculate_client_score(db: Session, client: Client) -> dict:
    developments = client.developments
    total = len(developments)
    approved = sum(1 for item in developments if item.current_stage == Stage.APROVADO.value)
    cancelled = sum(1 for item in developments if item.status in CLOSED)
    approval_rate = approved / total if total else 0
    cancel_rate = cancelled / total if total else 0

    version_counts = []
    first_sample_approved = 0
    for item in developments:
        sends = sum(1 for event in item.stage_events if event.stage == Stage.ENVIO_CLIENTE.value)
        if sends:
            version_counts.append(sends)
            if item.current_stage == Stage.APROVADO.value and sends == 1:
                first_sample_approved += 1

    average_versions = sum(version_counts) / len(version_counts) if version_counts else 0
    first_sample_rate = first_sample_approved / approved if approved else 0
    score = round(min(100, approval_rate * 60 + first_sample_rate * 25 + max(0, 15 - average_versions * 3)))
    grade = "A" if score >= 80 else "B" if score >= 65 else "C" if score >= 45 else "D"
    summary = (
        "Elevada conversão e aprovação rápida." if grade == "A" else
        "Bom potencial, com algumas alterações recorrentes." if grade == "B" else
        "Cliente exigente; rever histórico antes de desenvolver." if grade == "C" else
        "Conversão reduzida; validar preço e intenção antes de avançar."
    )
    return {
        "client_id": client.id,
        "name": client.name,
        "grade": grade,
        "score": score,
        "approval_rate": round(approval_rate * 100, 1),
        "first_sample_rate": round(first_sample_rate * 100, 1),
        "average_versions": round(average_versions, 1),
        "total_developments": total,
        "cancel_rate": round(cancel_rate * 100, 1),
        "tastes": taste_keywords([item.title for item in developments if item.status not in CLOSED]),
        "avoids": taste_keywords([item.title for item in developments if item.status in CLOSED], limit=3),
        "summary": summary,
    }
