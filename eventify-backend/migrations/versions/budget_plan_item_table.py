"""budget_plan_item for category allocations

Revision ID: budget_plan_item_table
Revises: organizer_listing_fields
Create Date: 2026-04-20

"""
from alembic import op
import sqlalchemy as sa


revision = "budget_plan_item_table"
down_revision = "organizer_listing_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "budget_plan_item",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("allocated_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["event.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("budget_plan_item")
