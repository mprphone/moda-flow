"""adapt developments to the real customer-request workflow

Revision ID: 0013_real_workflow
Revises: 0012_development_images
"""
from alembic import op
import sqlalchemy as sa

revision = "0013_real_workflow"
down_revision = "0012_development_images"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("developments", sa.Column("request_source", sa.String(length=30), nullable=True))
    op.add_column("developments", sa.Column("request_group", sa.String(length=120), nullable=True))
    op.create_index("ix_developments_request_group", "developments", ["request_group"], unique=False)
    op.add_column("developments", sa.Column("requested_quantity", sa.Integer(), nullable=True))
    op.add_column("developments", sa.Column("request_notes", sa.Text(), nullable=True))
    op.execute("UPDATE developments SET current_stage = 'desenvolvimento_malha' WHERE current_stage = 'tingimento'")
    op.execute("UPDATE stage_events SET stage = 'desenvolvimento_malha' WHERE stage = 'tingimento'")
    op.execute("UPDATE developments SET current_stage = 'finalizacao' WHERE current_stage = 'acessorios'")
    op.execute("UPDATE stage_events SET stage = 'finalizacao' WHERE stage = 'acessorios'")


def downgrade() -> None:
    op.drop_index("ix_developments_request_group", table_name="developments")
    op.drop_column("developments", "request_group")
    op.drop_column("developments", "request_notes")
    op.drop_column("developments", "requested_quantity")
    op.drop_column("developments", "request_source")
