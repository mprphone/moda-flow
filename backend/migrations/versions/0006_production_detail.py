"""Ficha rica de produção: eventos de fase, notas e comentários.

- productions.description
- tabela production_events (histórico de fases)
- comments.production_id + development_id passa a nullable
Condicional porque a revisão bootstrap (create_all) já cria tudo em bases novas.
"""
import sqlalchemy as sa
from alembic import op

revision = "0006_production_detail"
down_revision = "0005_fabric_labels"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    prod_columns = [c["name"] for c in inspector.get_columns("productions")]
    if "description" not in prod_columns:
        op.add_column("productions", sa.Column("description", sa.Text(), nullable=True))

    if "production_events" not in inspector.get_table_names():
        op.create_table(
            "production_events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("production_id", sa.Integer(), sa.ForeignKey("productions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("stage", sa.String(50), nullable=False),
            sa.Column("status", sa.String(30), nullable=False, server_default="active"),
            sa.Column("started_at", sa.DateTime(), nullable=False),
            sa.Column("ended_at", sa.DateTime(), nullable=True),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("responsible_name", sa.String(120), nullable=True),
        )
        op.create_index("ix_production_events_production_id", "production_events", ["production_id"])

    comment_columns = [c["name"] for c in inspector.get_columns("comments")]
    if "production_id" not in comment_columns:
        op.add_column("comments", sa.Column("production_id", sa.Integer(), sa.ForeignKey("productions.id"), nullable=True))
        op.create_index("ix_comments_production_id", "comments", ["production_id"])
    # development_id passa a nullable (PostgreSQL); ignora se já estiver
    if bind.dialect.name == "postgresql":
        op.alter_column("comments", "development_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.drop_column("comments", "production_id")
    op.drop_table("production_events")
    op.drop_column("productions", "description")
