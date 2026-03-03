"""Add organizer payment tracking flags on Event

Revision ID: organizer_payment_flags
Revises: event_status_lifecycle
Create Date: 2026-03-04
"""

from alembic import op
import sqlalchemy as sa


revision = "organizer_payment_flags"
down_revision = "event_status_lifecycle"
branch_labels = None
depends_on = None


def _column_exists(conn, table: str, column: str) -> bool:
    r = conn.execute(sa.text(f"PRAGMA table_info({table})"))
    return any(row[1] == column for row in r)


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(
        sa.text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=:table"
        ),
        {"table": table},
    )
    return r.fetchone() is not None


def upgrade():
    conn = op.get_bind()

    # Add boolean flags to event if they do not exist
    with op.batch_alter_table("event", schema=None) as batch_op:
        if not _column_exists(conn, "event", "organizer_advance_paid"):
            batch_op.add_column(
                sa.Column(
                    "organizer_advance_paid",
                    sa.Boolean(),
                    nullable=False,
                    server_default="0",
                )
            )
        if not _column_exists(conn, "event", "organizer_final_requested"):
            batch_op.add_column(
                sa.Column(
                    "organizer_final_requested",
                    sa.Boolean(),
                    nullable=False,
                    server_default="0",
                )
            )
        if not _column_exists(conn, "event", "organizer_final_paid"):
            batch_op.add_column(
                sa.Column(
                    "organizer_final_paid",
                    sa.Boolean(),
                    nullable=False,
                    server_default="0",
                )
            )

    # Backfill organizer_advance_paid where there is already a paid
    # OrganizerPaymentRequest for the event.
    if _table_exists(conn, "organizer_payment_request"):
        conn.execute(
            sa.text(
                """
                UPDATE event
                SET organizer_advance_paid = 1
                WHERE EXISTS (
                    SELECT 1 FROM organizer_payment_request opr
                    WHERE opr.event_id = event.id
                      AND opr.status = 'paid'
                )
                """
            )
        )


def downgrade():
    conn = op.get_bind()
    with op.batch_alter_table("event", schema=None) as batch_op:
        if _column_exists(conn, "event", "organizer_final_paid"):
            batch_op.drop_column("organizer_final_paid")
        if _column_exists(conn, "event", "organizer_final_requested"):
            batch_op.drop_column("organizer_final_requested")
        if _column_exists(conn, "event", "organizer_advance_paid"):
            batch_op.drop_column("organizer_advance_paid")

