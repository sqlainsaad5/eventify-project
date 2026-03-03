"""Budget Planner schema: Event fields, EventVendorAgreement, Payment columns

Revision ID: budget_planner_schema
Revises: add_user_is_active
Create Date: 2025-03-02

"""
from alembic import op
import sqlalchemy as sa


revision = "budget_planner_schema"
down_revision = "add_user_is_active"
branch_labels = None
depends_on = None


def _column_exists(conn, table, column):
    r = conn.execute(sa.text(f"PRAGMA table_info({table})"))
    return any(row[1] == column for row in r)


def _table_exists(conn, table):
    r = conn.execute(sa.text(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'"))
    return r.fetchone() is not None


def upgrade():
    conn = op.get_bind()

    # Event: add total_spent, remaining_budget (if not exist)
    if not _column_exists(conn, "event", "total_spent"):
        with op.batch_alter_table("event", schema=None) as batch_op:
            batch_op.add_column(sa.Column("total_spent", sa.Float(), nullable=True, server_default="0"))
    if not _column_exists(conn, "event", "remaining_budget"):
        with op.batch_alter_table("event", schema=None) as batch_op:
            batch_op.add_column(sa.Column("remaining_budget", sa.Float(), nullable=True))

    # Backfill remaining_budget = budget - total_spent for existing events
    conn.execute(sa.text(
        "UPDATE event SET total_spent = COALESCE((SELECT SUM(amount) FROM payment WHERE payment.event_id = event.id AND payment.status = 'completed'), 0)"
    ))
    conn.execute(sa.text(
        "UPDATE event SET remaining_budget = budget - COALESCE(total_spent, 0)"
    ))

    # Payment: add vendor_id, payment_type, notes (only if not exist)
    if not _column_exists(conn, "payment", "vendor_id"):
        with op.batch_alter_table("payment", schema=None) as batch_op:
            batch_op.add_column(sa.Column("vendor_id", sa.Integer(), nullable=True))
    if not _column_exists(conn, "payment", "payment_type"):
        with op.batch_alter_table("payment", schema=None) as batch_op:
            batch_op.add_column(sa.Column("payment_type", sa.String(20), nullable=True))
    if not _column_exists(conn, "payment", "notes"):
        with op.batch_alter_table("payment", schema=None) as batch_op:
            batch_op.add_column(sa.Column("notes", sa.Text(), nullable=True))

    # Create event_vendor_agreement table (if not exist)
    if not _table_exists(conn, "event_vendor_agreement"):
        op.create_table(
        "event_vendor_agreement",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("vendor_id", sa.Integer(), nullable=False),
        sa.Column("agreed_price", sa.Float(), nullable=False),
        sa.Column("service_type", sa.String(100), nullable=True, server_default="General"),
        sa.Column("payment_status", sa.String(20), nullable=True, server_default="pending"),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(["event_id"], ["event.id"], ),
        sa.ForeignKeyConstraint(["vendor_id"], ["user.id"], ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", "vendor_id", name="uq_event_vendor_agreement"),
        )


def downgrade():
    conn = op.get_bind()
    if _table_exists(conn, "event_vendor_agreement"):
        op.drop_table("event_vendor_agreement")
    if _column_exists(conn, "payment", "notes"):
        with op.batch_alter_table("payment", schema=None) as batch_op:
            batch_op.drop_column("notes")
    if _column_exists(conn, "payment", "payment_type"):
        with op.batch_alter_table("payment", schema=None) as batch_op:
            batch_op.drop_column("payment_type")
    if _column_exists(conn, "event", "remaining_budget"):
        with op.batch_alter_table("event", schema=None) as batch_op:
            batch_op.drop_column("remaining_budget")
    if _column_exists(conn, "event", "total_spent"):
        with op.batch_alter_table("event", schema=None) as batch_op:
            batch_op.drop_column("total_spent")
