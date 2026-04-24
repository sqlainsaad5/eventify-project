"""event created_at and updated_at for recency ordering

Revision ID: event_table_timestamps
Revises: vendor_events_partnership_flow
Create Date: 2026-04-24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision = "event_table_timestamps"
down_revision = "vendor_events_partnership_flow"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("event", schema=None) as batch_op:
        batch_op.add_column(sa.Column("created_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("updated_at", sa.DateTime(), nullable=True))
    op.execute(text("UPDATE event SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
    op.execute(
        text(
            "UPDATE event SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL"
        )
    )


def downgrade():
    with op.batch_alter_table("event", schema=None) as batch_op:
        batch_op.drop_column("updated_at")
        batch_op.drop_column("created_at")
