"""Sessões temporárias para fotografias por QR code."""
from alembic import op
import sqlalchemy as sa

revision = "0010_qr_uploads"
down_revision = "0009_shopping_workflow"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "upload_sessions",
        sa.Column("token", sa.String(64), primary_key=True),
        sa.Column("file_url", sa.String(500), nullable=True),
        sa.Column("mime_type", sa.String(120), nullable=True),
        sa.Column("original_name", sa.String(255), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_upload_sessions_expires_at", "upload_sessions", ["expires_at"])
    op.add_column("shopping_purchases", sa.Column("attachments_json", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("shopping_purchases", "attachments_json")
    op.drop_table("upload_sessions")
