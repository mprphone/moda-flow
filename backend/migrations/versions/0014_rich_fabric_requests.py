"""enrich fabric requests with structured order details and attachments

Revision ID: 0014_rich_fabrics
Revises: 0013_real_workflow
"""
import json
import re
from alembic import op
import sqlalchemy as sa

revision = "0014_rich_fabrics"
down_revision = "0013_real_workflow"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("fabric_requests", sa.Column("request_channel", sa.String(length=30), nullable=True))
    op.add_column("fabric_requests", sa.Column("stock_status", sa.String(length=30), nullable=False, server_default="unknown"))
    op.create_index("ix_fabric_requests_stock_status", "fabric_requests", ["stock_status"], unique=False)
    op.add_column("fabric_requests", sa.Column("requested_by", sa.String(length=120), nullable=True))
    op.add_column("fabric_requests", sa.Column("requested_to", sa.String(length=120), nullable=True))
    op.add_column("fabric_requests", sa.Column("treatment_notes", sa.Text(), nullable=True))
    op.add_column("fabric_requests", sa.Column("attachments_json", sa.Text(), nullable=True))
    op.add_column("fabric_requests", sa.Column("expected_at", sa.Date(), nullable=True))
    op.add_column("fabric_requests", sa.Column("supplier_confirmed_at", sa.Date(), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(sa.text("SELECT id, notes, quantity_meters, cover_url FROM fabric_requests")).mappings()
    for row in rows:
        notes = row["notes"] or ""
        lowered = notes.lower()
        channel = next((name for name in ("whatsapp", "email", "telefone", "reunião") if name in lowered), None)
        contact = re.search(r"pedido\s+(?:ao|à|a)\s+([^:\n]+?)(?:\s+por\s+(?:whatsapp|email|telefone)|:|\n|$)", notes, re.IGNORECASE)
        quantity = None
        if row["quantity_meters"] is None:
            match = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:mts?|metros?)\b", lowered)
            quantity = float(match.group(1).replace(",", ".")) if match else None
        treatment = "\n".join(line.strip() for line in notes.splitlines() if any(word in line.lower() for word in ("tingir", "tingimento", "lavar", "acabamento"))) or None
        attachments = []
        if row["cover_url"]:
            attachments.append({"url": row["cover_url"], "mime_type": "image/*", "name": "Fotografia principal"})
        stock_status = "available" if "stock dispon" in lowered else "unavailable" if "sem stock" in lowered else "discontinued" if "fora de cole" in lowered else "developing" if "desenvolver rolo" in lowered else "unknown"
        connection.execute(sa.text("""
            UPDATE fabric_requests
            SET request_channel = :channel,
                stock_status = :stock_status,
                requested_to = :contact,
                treatment_notes = :treatment,
                quantity_meters = COALESCE(quantity_meters, :quantity),
                attachments_json = :attachments
            WHERE id = :id
        """), {
            "id": row["id"], "channel": channel, "stock_status": stock_status,
            "contact": contact.group(1).strip() if contact else None,
            "treatment": treatment, "quantity": quantity,
            "attachments": json.dumps(attachments),
        })
    connection.execute(sa.text("""
        UPDATE fabric_requests SET stock_status = 'available', status = 'envio_em_curso'
        WHERE id IN (
            SELECT fl.fabric_request_id FROM fabric_labels fl JOIN labels l ON l.id = fl.label_id
            WHERE lower(l.name) LIKE '%stock disponível%' AND lower(l.name) LIKE '%envio em curso%'
        )
    """))
    connection.execute(sa.text("""
        UPDATE fabric_requests SET stock_status = 'unavailable'
        WHERE id IN (SELECT fl.fabric_request_id FROM fabric_labels fl JOIN labels l ON l.id = fl.label_id WHERE lower(l.name) LIKE '%sem stock%')
    """))
    connection.execute(sa.text("""
        UPDATE fabric_requests SET stock_status = 'discontinued'
        WHERE id IN (SELECT fl.fabric_request_id FROM fabric_labels fl JOIN labels l ON l.id = fl.label_id WHERE lower(l.name) LIKE '%fora de coleção%')
    """))
    connection.execute(sa.text("""
        UPDATE fabric_requests SET stock_status = 'developing'
        WHERE id IN (SELECT fl.fabric_request_id FROM fabric_labels fl JOIN labels l ON l.id = fl.label_id WHERE lower(l.name) LIKE '%desenvolver rolo%')
    """))
    connection.execute(sa.text("""
        UPDATE fabric_requests SET status = 'recebida'
        WHERE id IN (SELECT fl.fabric_request_id FROM fabric_labels fl JOIN labels l ON l.id = fl.label_id WHERE lower(l.name) LIKE '%rolo/metros recebido%')
    """))


def downgrade() -> None:
    op.drop_column("fabric_requests", "supplier_confirmed_at")
    op.drop_column("fabric_requests", "expected_at")
    op.drop_column("fabric_requests", "attachments_json")
    op.drop_column("fabric_requests", "treatment_notes")
    op.drop_column("fabric_requests", "requested_to")
    op.drop_column("fabric_requests", "requested_by")
    op.drop_column("fabric_requests", "request_channel")
    op.drop_index("ix_fabric_requests_stock_status", table_name="fabric_requests")
    op.drop_column("fabric_requests", "stock_status")
