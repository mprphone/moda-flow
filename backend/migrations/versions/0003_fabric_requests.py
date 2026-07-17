"""Cria a tabela fabric_requests (pedidos de malha).

Condicional porque a revisão bootstrap (create_all) já cria a tabela em bases
de dados novas; aqui só é criada em bases que existiam antes.
"""
import sqlalchemy as sa
from alembic import op

revision = "0003_fabric_requests"
down_revision = "0002_description"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "fabric_requests" in sa.inspect(bind).get_table_names():
        return
    op.create_table(
        "fabric_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reference", sa.String(120), nullable=False),
        sa.Column("article", sa.String(120), nullable=True),
        sa.Column("composition", sa.String(120), nullable=True),
        sa.Column("width", sa.String(40), nullable=True),
        sa.Column("grammage", sa.String(40), nullable=True),
        sa.Column("color", sa.String(120), nullable=True),
        sa.Column("quantity_meters", sa.Numeric(10, 2), nullable=True),
        sa.Column("price_per_meter", sa.Numeric(10, 2), nullable=True),
        sa.Column("leadtime", sa.String(120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("cover_url", sa.String(500), nullable=True),
        sa.Column("status", sa.String(40), nullable=False, server_default="pedido"),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=True),
        sa.Column("development_id", sa.Integer(), sa.ForeignKey("developments.id"), nullable=True),
        sa.Column("requested_at", sa.Date(), nullable=False),
        sa.Column("received_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_fabric_requests_status", "fabric_requests", ["status"])
    op.create_index("ix_fabric_requests_supplier_id", "fabric_requests", ["supplier_id"])
    op.create_index("ix_fabric_requests_development_id", "fabric_requests", ["development_id"])


def downgrade() -> None:
    op.drop_table("fabric_requests")
