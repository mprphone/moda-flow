"""Galeria de fotografias dos desenvolvimentos."""
from alembic import op
import sqlalchemy as sa

revision = "0012_development_images"
down_revision = "0011_team_profiles"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("developments", sa.Column("images_json", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("developments", "images_json")
