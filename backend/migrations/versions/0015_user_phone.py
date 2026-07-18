"""Adiciona a coluna phone aos utilizadores.

Condicional porque a revisão bootstrap (create_all) já cria a coluna em bases novas.
"""
import sqlalchemy as sa
from alembic import op

revision = "0015_user_phone"
down_revision = "0015_trello_dates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = [c["name"] for c in sa.inspect(bind).get_columns("users")]
    if "phone" not in columns:
        op.add_column("users", sa.Column("phone", sa.String(40), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "phone")
