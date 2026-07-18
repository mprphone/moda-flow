"""Malhas partilhadas por modelos e materiais usados em produção."""
import sqlalchemy as sa
from alembic import op

revision = "0008_material_links"
down_revision = "0007_parallel_tasks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = sa.inspect(bind).get_table_names()
    if "fabric_development_links" not in tables:
        op.create_table(
            "fabric_development_links",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("fabric_request_id", sa.Integer(), sa.ForeignKey("fabric_requests.id", ondelete="CASCADE"), nullable=False),
            sa.Column("development_id", sa.Integer(), sa.ForeignKey("developments.id", ondelete="CASCADE"), nullable=False),
            sa.Column("relation_type", sa.String(30), nullable=False, server_default="candidate"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("fabric_request_id", "development_id", name="uq_fabric_development"),
        )
        op.create_index("ix_fabric_development_links_fabric_request_id", "fabric_development_links", ["fabric_request_id"])
        op.create_index("ix_fabric_development_links_development_id", "fabric_development_links", ["development_id"])
        op.execute(sa.text("""
            INSERT INTO fabric_development_links (fabric_request_id, development_id, relation_type, created_at)
            SELECT id, development_id, 'legacy', created_at
            FROM fabric_requests WHERE development_id IS NOT NULL
        """))

    if "production_fabric_links" not in tables:
        op.create_table(
            "production_fabric_links",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("production_id", sa.Integer(), sa.ForeignKey("productions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("fabric_request_id", sa.Integer(), sa.ForeignKey("fabric_requests.id", ondelete="CASCADE"), nullable=False),
            sa.Column("usage_status", sa.String(30), nullable=False, server_default="used"),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("production_id", "fabric_request_id", name="uq_production_fabric"),
        )
        op.create_index("ix_production_fabric_links_production_id", "production_fabric_links", ["production_id"])
        op.create_index("ix_production_fabric_links_fabric_request_id", "production_fabric_links", ["fabric_request_id"])


def downgrade() -> None:
    op.drop_table("production_fabric_links")
    op.drop_table("fabric_development_links")
