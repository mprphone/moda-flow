"""Completa o fluxo documental do Shopping."""
from alembic import op
import sqlalchemy as sa

revision = "0009_shopping_workflow"
down_revision = "0008_material_links"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("shopping_purchases", sa.Column("invoice_sent", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("shopping_purchases", sa.Column("credit_note_sent", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("shopping_purchases", sa.Column("notes", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("shopping_purchases", "notes")
    op.drop_column("shopping_purchases", "credit_note_sent")
    op.drop_column("shopping_purchases", "invoice_sent")
