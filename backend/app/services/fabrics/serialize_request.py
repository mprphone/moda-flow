from app.core.timeutil import today
from app.models.fabric_request import FabricRequest

REMINDER_AFTER_DAYS = 5
PENDING_STATUSES = {"pedido", "envio_em_curso"}


def serialize_request(item: FabricRequest) -> dict:
    days_pending = (today() - item.requested_at).days if item.status in PENDING_STATUSES else None
    days_to_receive = (item.received_at - item.requested_at).days if item.received_at else None
    return {
        "id": item.id,
        "reference": item.reference,
        "article": item.article,
        "composition": item.composition,
        "width": item.width,
        "grammage": item.grammage,
        "color": item.color,
        "quantity_meters": float(item.quantity_meters) if item.quantity_meters is not None else None,
        "price_per_meter": float(item.price_per_meter) if item.price_per_meter is not None else None,
        "leadtime": item.leadtime,
        "notes": item.notes,
        "cover_url": item.cover_url,
        "status": item.status,
        "supplier_id": item.supplier_id,
        "supplier_name": item.supplier.name if item.supplier else None,
        "development_id": item.development_id,
        "development_code": item.development.code if item.development else None,
        "requested_at": item.requested_at,
        "received_at": item.received_at,
        "labels": [{"id": label.id, "name": label.name, "tone": label.tone} for label in item.labels],
        "days_pending": days_pending,
        "days_to_receive": days_to_receive,
        "needs_reminder": bool(days_pending is not None and days_pending >= REMINDER_AFTER_DAYS),
    }
