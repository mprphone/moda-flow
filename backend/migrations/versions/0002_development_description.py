"""Acrescenta a coluna description (notas) aos desenvolvimentos.

Condicional porque a revisão bootstrap (create_all) já cria a coluna em bases
de dados novas; aqui só é adicionada a bases que existiam antes.
"""
import sqlalchemy as sa
from alembic import op

revision = "0002_description"
down_revision = "0001_bootstrap"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = [column["name"] for column in sa.inspect(bind).get_columns("developments")]
    if "description" not in columns:
        op.add_column("developments", sa.Column("description", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("developments", "description")
