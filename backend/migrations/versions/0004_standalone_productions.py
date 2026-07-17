"""Produções autónomas: título + cliente próprios e desenvolvimento opcional.

Condicional porque a revisão bootstrap (create_all) já cria as colunas em bases novas.
"""
import sqlalchemy as sa
from alembic import op

revision = "0004_standalone_prod"
down_revision = "0003_fabric_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = [column["name"] for column in sa.inspect(bind).get_columns("productions")]
    if "title" not in columns:
        op.add_column("productions", sa.Column("title", sa.String(200), nullable=True))
    if "client_id" not in columns:
        op.add_column("productions", sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=True))
    op.alter_column("productions", "development_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.alter_column("productions", "development_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("productions", "client_id")
    op.drop_column("productions", "title")
