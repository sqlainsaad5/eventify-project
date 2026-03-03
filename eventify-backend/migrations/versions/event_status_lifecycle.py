"""Add event.status lifecycle field and backfill existing events

Revision ID: event_status_lifecycle
Revises: budget_planner_schema
Create Date: 2026-03-04
"""

from alembic import op
import sqlalchemy as sa


revision = "event_status_lifecycle"
down_revision = "budget_planner_schema"
branch_labels = None
depends_on = None


def _column_exists(conn, table, column):
    r = conn.execute(sa.text(f"PRAGMA table_info({table})"))
    return any(row[1] == column for row in r)


def _table_exists(conn, table):
    r = conn.execute(
        sa.text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=:table"
        ),
        {"table": table},
    )
    return r.fetchone() is not None


def upgrade():
    conn = op.get_bind()

    # Add status column to event if it does not exist
    if not _column_exists(conn, "event", "status"):
        with op.batch_alter_table("event", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    "status",
                    sa.String(length=50),
                    nullable=False,
                    server_default="created",
                )
            )

    # Backfill lifecycle states based on existing data
    # Default everything to 'created'
    conn.execute(sa.text("UPDATE event SET status = 'created'"))

    # awaiting_organizer_confirmation: organizer assigned but not yet accepted/rejected
    conn.execute(
        sa.text(
            """
            UPDATE event
            SET status = 'awaiting_organizer_confirmation'
            WHERE organizer_id IS NOT NULL
              AND (organizer_status IS NULL OR organizer_status = 'pending')
            """
        )
    )

    # pending_advance_payment: organizer accepted and no paid organizer_request yet
    if _table_exists(conn, "organizer_payment_request"):
        conn.execute(
            sa.text(
                """
                UPDATE event
                SET status = 'pending_advance_payment'
                WHERE organizer_status = 'accepted'
                  AND NOT EXISTS (
                      SELECT 1 FROM organizer_payment_request opr
                      WHERE opr.event_id = event.id
                        AND opr.status = 'paid'
                  )
                """
            )
        )

        # advance_payment_completed: organizer accepted and at least one paid organizer_request
        conn.execute(
            sa.text(
                """
                UPDATE event
                SET status = 'advance_payment_completed'
                WHERE organizer_status = 'accepted'
                  AND EXISTS (
                      SELECT 1 FROM organizer_payment_request opr
                      WHERE opr.event_id = event.id
                        AND opr.status = 'paid'
                  )
                """
            )
        )

    # vendor_assigned: advance payment completed and at least one vendor assigned
    if _table_exists(conn, "vendor_events"):
        conn.execute(
            sa.text(
                """
                UPDATE event
                SET status = 'vendor_assigned'
                WHERE status = 'advance_payment_completed'
                  AND EXISTS (
                      SELECT 1 FROM vendor_events ve
                      WHERE ve.event_id = event.id
                  )
                """
            )
        )

    # completed: if progress is 100 or more, treat as completed
    conn.execute(
        sa.text(
            """
            UPDATE event
            SET status = 'completed'
            WHERE progress >= 100
            """
        )
    )


def downgrade():
    conn = op.get_bind()
    if _column_exists(conn, "event", "status"):
        with op.batch_alter_table("event", schema=None) as batch_op:
            batch_op.drop_column("status")

