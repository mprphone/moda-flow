from app.core.timeutil import today


def serialize_purchase(item):
    days = (item.return_deadline - today()).days if item.return_deadline else None
    return {
        "id": item.id,
        "brand": item.brand,
        "reference": item.reference,
        "amount": float(item.amount),
        "purchase_date": item.purchase_date,
        "return_deadline": item.return_deadline,
        "status": item.status,
        "invoice_number": item.invoice_number,
        "credit_note_number": item.credit_note_number,
        "refund_received": item.refund_received,
        "invoice_sent": item.invoice_sent,
        "credit_note_sent": item.credit_note_sent,
        "notes": item.notes,
        "cover_url": item.cover_url,
        "development_id": item.development_id,
        "days_to_return": days,
    }
