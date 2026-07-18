from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.timeutil import today
from app.models.client import Client
from app.models.development import Development
from app.models.fabric_request import FabricRequest
from app.models.production import Production
from app.models.shopping import ShoppingPurchase
from app.models.supplier import Supplier

router = APIRouter()


def resolve_range(start: date | None, end: date | None) -> tuple[date, date]:
    """Se não vier período, usa o mês corrente."""
    if not start or not end:
        current = today()
        start = start or current.replace(day=1)
        end = end or current
    if end < start:
        start, end = end, start
    return start, end


@router.get("/summary")
def summary(
    start: date | None = Query(None),
    end: date | None = Query(None),
    db: Session = Depends(get_db),
):
    start, end = resolve_range(start, end)
    # created_at é DateTime; usamos um intervalo [start 00:00, end+1dia) para incluir o dia final.
    start_dt = datetime(start.year, start.month, start.day)
    end_dt = datetime(end.year, end.month, end.day) + timedelta(days=1)

    # 1. Peças desenvolvidas (data de criação do desenvolvimento)
    dev_where = (Development.created_at >= start_dt, Development.created_at < end_dt)
    dev_total = db.scalar(select(func.count(Development.id)).where(*dev_where)) or 0
    dev_approved = db.scalar(select(func.count(Development.id)).where(*dev_where, Development.current_stage == "aprovado")) or 0
    dev_by_client = db.execute(
        select(Client.name, func.count(Development.id))
        .join(Client, Client.id == Development.client_id)
        .where(*dev_where)
        .group_by(Client.name)
        .order_by(func.count(Development.id).desc())
    ).all()

    # 2. Produções (data de criação da produção)
    prod_where = (Production.created_at >= start_dt, Production.created_at < end_dt)
    prod_total = db.scalar(select(func.count(Production.id)).where(*prod_where)) or 0
    prod_qty = db.scalar(select(func.coalesce(func.sum(Production.quantity), 0)).where(*prod_where)) or 0
    prod_by_client = db.execute(
        select(Client.name, func.count(Production.id), func.coalesce(func.sum(Production.quantity), 0))
        .join(Client, Client.id == Production.client_id)
        .where(*prod_where)
        .group_by(Client.name)
        .order_by(func.count(Production.id).desc())
    ).all()

    # 3. Shopping (data de compra) — gastos no período
    shop_where = (ShoppingPurchase.purchase_date >= start, ShoppingPurchase.purchase_date <= end)
    shop_total = db.scalar(select(func.count(ShoppingPurchase.id)).where(*shop_where)) or 0
    shop_amount = db.scalar(select(func.coalesce(func.sum(ShoppingPurchase.amount), 0)).where(*shop_where)) or 0
    shop_by_brand = db.execute(
        select(ShoppingPurchase.brand, func.count(ShoppingPurchase.id), func.coalesce(func.sum(ShoppingPurchase.amount), 0))
        .where(*shop_where)
        .group_by(ShoppingPurchase.brand)
        .order_by(func.coalesce(func.sum(ShoppingPurchase.amount), 0).desc())
    ).all()

    # 4. Malhas pedidas (data do pedido)
    fab_where = (FabricRequest.requested_at >= start, FabricRequest.requested_at <= end)
    fab_total = db.scalar(select(func.count(FabricRequest.id)).where(*fab_where)) or 0
    fab_by_supplier = db.execute(
        select(Supplier.name, func.count(FabricRequest.id))
        .join(Supplier, Supplier.id == FabricRequest.supplier_id)
        .where(*fab_where)
        .group_by(Supplier.name)
        .order_by(func.count(FabricRequest.id).desc())
    ).all()
    fab_no_supplier = db.scalar(select(func.count(FabricRequest.id)).where(*fab_where, FabricRequest.supplier_id.is_(None))) or 0

    return {
        "start": start,
        "end": end,
        "developments": {
            "total": dev_total,
            "approved": dev_approved,
            "by_client": [{"name": name, "count": count} for name, count in dev_by_client],
        },
        "productions": {
            "total": prod_total,
            "quantity": int(prod_qty),
            "by_client": [{"name": name, "count": count, "quantity": int(qty)} for name, count, qty in prod_by_client],
        },
        "shopping": {
            "total": shop_total,
            "amount": round(float(shop_amount), 2),
            "by_brand": [{"name": name, "count": count, "amount": round(float(amount), 2)} for name, count, amount in shop_by_brand],
        },
        "fabrics": {
            "total": fab_total,
            "by_supplier": (
                [{"name": name, "count": count} for name, count in fab_by_supplier]
                + ([{"name": "Sem fornecedor", "count": fab_no_supplier}] if fab_no_supplier else [])
            ),
        },
    }
