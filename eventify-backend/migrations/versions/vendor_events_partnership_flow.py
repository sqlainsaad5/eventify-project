"""Vendor event partnership: pending until vendor accepts

Revision ID: vendor_events_partnership_flow
Revises: budget_plan_item_table
Create Date: 2026-04-24
"""

from alembic import op
import sqlalchemy as sa


revision = "vendor_events_partnership_flow"
down_revision = "budget_plan_item_table"
branch_labels = None
depends_on = None


def _column_exists(conn, table, column):
    r = conn.execute(sa.text(f"PRAGMA table_info({table})"))
    return any(row[1] == column for row in r)


def upgrade():
    conn = op.get_bind()
    if not _column_exists(conn, "vendor_events", "partnership_status"):
        with op.batch_alter_table("vendor_events", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    "partnership_status",
                    sa.String(20),
                    nullable=False,
                    server_default="accepted",
                )
            )
    if not _column_exists(conn, "vendor_events", "partnership_confirmed_at"):
        with op.batch_alter_table("vendor_events", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column("partnership_confirmed_at", sa.DateTime(), nullable=True)
            )
    # Backfill: treat existing links as already confirmed
    conn.execute(
        sa.text(
            """
            UPDATE vendor_events
            SET partnership_status = 'accepted',
                partnership_confirmed_at = COALESCE(partnership_confirmed_at, assigned_at)
            """
        )
    )
    with op.batch_alter_table("vendor_events", schema=None) as batch_op:
        try:
            batch_op.alter_column("partnership_status", server_default=None)
        except Exception:
            pass


def downgrade():
    conn = op.get_bind()
    if _column_exists(conn, "vendor_events", "partnership_confirmed_at"):
        with op.batch_alter_table("vendor_events", schema=None) as batch_op:
            batch_op.drop_column("partnership_confirmed_at")
    if _column_exists(conn, "vendor_events", "partnership_status"):
        with op.batch_alter_table("vendor_events", schema=None) as batch_op:
            batch_op.drop_column("partnership_status")
