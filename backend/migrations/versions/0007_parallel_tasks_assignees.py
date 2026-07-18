"""Responsáveis estruturados e pendências paralelas dos desenvolvimentos."""
import sqlalchemy as sa
from alembic import op

revision = "0007_parallel_tasks"
down_revision = "0006_production_detail"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = sa.inspect(bind).get_table_names()
    if "development_assignees" not in tables:
        op.create_table(
            "development_assignees",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("development_id", sa.Integer(), sa.ForeignKey("developments.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("role", sa.String(40), nullable=False, server_default="parceria"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("development_id", "user_id", "role", name="uq_development_assignee_role"),
        )
        op.create_index("ix_development_assignees_development_id", "development_assignees", ["development_id"])
        op.create_index("ix_development_assignees_user_id", "development_assignees", ["user_id"])

    if "development_tasks" not in tables:
        op.create_table(
            "development_tasks",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("development_id", sa.Integer(), sa.ForeignKey("developments.id", ondelete="CASCADE"), nullable=False),
            sa.Column("kind", sa.String(50), nullable=False),
            sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("due_date", sa.Date(), nullable=True),
            sa.Column("responsible_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_development_tasks_development_id", "development_tasks", ["development_id"])
        op.create_index("ix_development_tasks_kind", "development_tasks", ["kind"])
        op.create_index("ix_development_tasks_status", "development_tasks", ["status"])


def downgrade() -> None:
    op.drop_table("development_tasks")
    op.drop_table("development_assignees")
