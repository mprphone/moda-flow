"""Bootstrap: cria o esquema completo a partir dos modelos.

Esta primeira revisão usa create_all, que ignora tabelas já existentes —
por isso também adota bases de dados criadas antes do Alembic, acrescentando
apenas o que falta (ex.: users, labels). As revisões seguintes devem ser
geradas com `alembic revision --autogenerate`.
"""
from alembic import op
from app.core.db import Base
from app import models  # noqa: F401

revision = "0001_bootstrap"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
