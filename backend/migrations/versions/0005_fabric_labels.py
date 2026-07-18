"""Etiquetas nas malhas: coluna scope em labels + tabela fabric_labels.

Condicional porque a revisão bootstrap (create_all) já cria tudo em bases novas.
"""
import sqlalchemy as sa
from alembic import op

revision = "0005_fabric_labels"
down_revision = "0004_standalone_prod"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    label_columns = [c["name"] for c in inspector.get_columns("labels")]
    if "scope" not in label_columns:
        op.add_column("labels", sa.Column("scope", sa.String(20), nullable=False, server_default="development"))
        op.create_index("ix_labels_scope", "labels", ["scope"])
    if "fabric_labels" not in inspector.get_table_names():
        op.create_table(
            "fabric_labels",
            sa.Column("fabric_request_id", sa.Integer(), sa.ForeignKey("fabric_requests.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("label_id", sa.Integer(), sa.ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True),
        )


def downgrade() -> None:
    op.drop_table("fabric_labels")
    op.drop_index("ix_labels_scope", table_name="labels")
    op.drop_column("labels", "scope")
