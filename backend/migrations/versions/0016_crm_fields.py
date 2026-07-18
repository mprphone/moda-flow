"""Campos de CRM em clientes e fornecedores.

Condicional porque a revisão bootstrap (create_all) já cria as colunas em bases novas.
"""
import sqlalchemy as sa
from alembic import op

revision = "0016_crm_fields"
down_revision = "0015_user_phone"
branch_labels = None
depends_on = None

CLIENT_COLUMNS = [
    ("email", sa.String(160)),
    ("phone", sa.String(50)),
    ("contact_person", sa.String(120)),
    ("segments", sa.String(200)),
    ("preferred_channel", sa.String(40)),
    ("meetings", sa.Text()),
]
SUPPLIER_COLUMNS = [
    ("contact_person", sa.String(120)),
    ("preferred_channel", sa.String(40)),
    ("meetings", sa.Text()),
    ("notes", sa.Text()),
]


def _add_missing(bind, table, columns):
    existing = [c["name"] for c in sa.inspect(bind).get_columns(table)]
    for name, col_type in columns:
        if name not in existing:
            op.add_column(table, sa.Column(name, col_type, nullable=True))


def upgrade() -> None:
    bind = op.get_bind()
    _add_missing(bind, "clients", CLIENT_COLUMNS)
    _add_missing(bind, "suppliers", SUPPLIER_COLUMNS)
    # notes do cliente passa de String(500) a Text no PostgreSQL (mais espaço)
    if bind.dialect.name == "postgresql":
        op.alter_column("clients", "notes", type_=sa.Text(), existing_type=sa.String(500))


def downgrade() -> None:
    for name, _ in SUPPLIER_COLUMNS:
        op.drop_column("suppliers", name)
    for name, _ in CLIENT_COLUMNS:
        op.drop_column("clients", name)
