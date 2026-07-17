from datetime import datetime
from sqlalchemy.orm import Session
from app.models.supplier import Supplier


def calculate_supplier_score(db: Session, supplier: Supplier) -> dict:
    completed = [event for event in supplier.stage_events if event.ended_at]
    active = [event for event in supplier.stage_events if not event.ended_at]
    delays = []
    on_time = 0
    measured = 0
    for event in completed:
        if event.promised_at:
            measured += 1
            delay = (event.ended_at - event.promised_at).total_seconds() / 86400
            delays.append(max(0, delay))
            if delay <= 0:
                on_time += 1
    on_time_rate = on_time / measured if measured else 0.75
    average_delay = sum(delays) / len(delays) if delays else 0
    score = round(max(0, min(100, on_time_rate * 80 + max(0, 20 - average_delay * 4))))
    grade = "A" if score >= 85 else "B" if score >= 70 else "C" if score >= 50 else "D"
    summary = (
        "Fornecedor muito fiável e consistente." if grade == "A" else
        "Bom fornecedor; acompanhar prazos em pedidos urgentes." if grade == "B" else
        "Qualidade aceitável, mas com risco de atraso." if grade == "C" else
        "Desempenho fraco; considerar alternativa."
    )
    return {
        "supplier_id": supplier.id,
        "name": supplier.name,
        "grade": grade,
        "score": score,
        "on_time_rate": round(on_time_rate * 100, 1),
        "average_delay_days": round(average_delay, 1),
        "active_requests": len(active),
        "summary": summary,
    }
