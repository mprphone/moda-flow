from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.fabric_request import FabricRequest
from app.models.supplier import Supplier


def calculate_supplier_score(db: Session, supplier: Supplier) -> dict:
    # Sinal 1: eventos de fase com prazo prometido (fluxo normal da app)
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

    # Sinal 2: pedidos de malha (histórico importado + fluxo diário)
    requests = db.scalars(select(FabricRequest).where(FabricRequest.supplier_id == supplier.id)).all()
    deliveries = [
        (item.received_at - item.requested_at).days
        for item in requests
        if item.received_at and item.requested_at and item.received_at >= item.requested_at
    ]
    fabric_cancelled = sum(1 for item in requests if item.status == "cancelada")
    fabric_pending = sum(1 for item in requests if item.status in {"pedido", "envio_em_curso"})
    fabric_avg_days = round(sum(deliveries) / len(deliveries), 1) if deliveries else None

    if measured:
        on_time_rate = on_time / measured
        average_delay = sum(delays) / len(delays) if delays else 0
    elif deliveries:
        # Sem prazos prometidos: usa a entrega de malhas (<= 7 dias conta como "no prazo")
        on_time_rate = sum(1 for days in deliveries if days <= 7) / len(deliveries)
        average_delay = max(0.0, (sum(deliveries) / len(deliveries)) - 7)
    else:
        on_time_rate = 0.75
        average_delay = 0

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
        "active_requests": len(active) + fabric_pending,
        "fabric_total": len(requests),
        "fabric_avg_days": fabric_avg_days,
        "fabric_cancel_rate": round(fabric_cancelled / len(requests) * 100, 1) if requests else 0,
        "summary": summary,
    }
