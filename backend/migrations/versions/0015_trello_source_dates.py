"""Guarda a data e a identidade dos cartões Trello de origem.

Revision ID: 0015_trello_dates
Revises: 0014_rich_fabrics
"""
import sqlalchemy as sa
from alembic import op

revision = "0015_trello_dates"
down_revision = "0014_rich_fabrics"
branch_labels = None
depends_on = None


def column_names(table: str) -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)}


def index_names(table: str) -> set[str]:
    return {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table)}


def upgrade() -> None:
    for table in ("developments", "productions"):
        columns = column_names(table)
        if "source_created_at" not in columns:
            op.add_column(table, sa.Column("source_created_at", sa.DateTime(), nullable=True))
        if "trello_card_id" not in columns:
            op.add_column(table, sa.Column("trello_card_id", sa.String(length=32), nullable=True))
        indexes = index_names(table)
        source_index = f"ix_{table}_source_created_at"
        card_index = f"ix_{table}_trello_card_id"
        if source_index not in indexes:
            op.create_index(source_index, table, ["source_created_at"], unique=False)
        if card_index not in indexes:
            op.create_index(card_index, table, ["trello_card_id"], unique=True)

    for table in ("fabric_requests", "shopping_purchases"):
        if "trello_card_id" not in column_names(table):
            op.add_column(table, sa.Column("trello_card_id", sa.String(length=32), nullable=True))
        card_index = f"ix_{table}_trello_card_id"
        if card_index not in index_names(table):
            op.create_index(card_index, table, ["trello_card_id"], unique=True)


def downgrade() -> None:
    for table in ("fabric_requests", "shopping_purchases"):
        op.drop_index(f"ix_{table}_trello_card_id", table_name=table)
        op.drop_column(table, "trello_card_id")
    for table in ("developments", "productions"):
        op.drop_index(f"ix_{table}_trello_card_id", table_name=table)
        op.drop_index(f"ix_{table}_source_created_at", table_name=table)
        op.drop_column(table, "trello_card_id")
        op.drop_column(table, "source_created_at")
