"""Código de referência do cliente (B001...) e iniciais da designer (IF...).

Condicional porque a revisão bootstrap (create_all) já cria as colunas em bases novas.
"""
import sqlalchemy as sa
from alembic import op

revision = "0017_reference_codes"
down_revision = "0016_crm_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    client_cols = [c["name"] for c in sa.inspect(bind).get_columns("clients")]
    if "code" not in client_cols:
        op.add_column("clients", sa.Column("code", sa.String(10), nullable=True))
        op.create_index("ix_clients_code", "clients", ["code"])
    user_cols = [c["name"] for c in sa.inspect(bind).get_columns("users")]
    if "initials" not in user_cols:
        op.add_column("users", sa.Column("initials", sa.String(5), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "initials")
    op.drop_index("ix_clients_code", table_name="clients")
    op.drop_column("clients", "code")
