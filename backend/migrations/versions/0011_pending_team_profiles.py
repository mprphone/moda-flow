"""Cria fichas pendentes para responsáveis já usados nos desenvolvimentos."""
from alembic import op
import sqlalchemy as sa

revision = "0011_team_profiles"
down_revision = "0010_qr_uploads"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("users", "email", existing_type=sa.String(160), nullable=True)
    op.alter_column("users", "password_hash", existing_type=sa.String(200), nullable=True)
    op.execute(sa.text("""
        INSERT INTO users (name, email, password_hash, role, is_active, created_at)
        SELECT DISTINCT TRIM(d.owner_name), NULL, NULL, 'designer', false, CURRENT_TIMESTAMP
        FROM developments d
        WHERE TRIM(COALESCE(d.owner_name, '')) <> ''
          AND LOWER(TRIM(d.owner_name)) <> 'equipa'
          AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(TRIM(u.name)) = LOWER(TRIM(d.owner_name)))
    """))


def downgrade():
    op.execute(sa.text("DELETE FROM users WHERE email IS NULL AND password_hash IS NULL"))
    op.alter_column("users", "password_hash", existing_type=sa.String(200), nullable=False)
    op.alter_column("users", "email", existing_type=sa.String(160), nullable=False)
