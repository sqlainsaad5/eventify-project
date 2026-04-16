"""Add review table for event-scoped ratings

Revision ID: reviews_schema
Revises: organizer_payment_flags
Create Date: 2026-04-16

"""
from alembic import op
import sqlalchemy as sa


revision = "reviews_schema"
down_revision = "organizer_payment_flags"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "review",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=False),
        sa.Column("review_type", sa.String(length=40), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="published"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["author_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["event_id"], ["event.id"]),
        sa.ForeignKeyConstraint(["subject_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", "author_id", "review_type", name="uq_review_event_author_type"),
    )
    op.create_index(
        "ix_review_subject_type_status",
        "review",
        ["subject_id", "review_type", "status"],
        unique=False,
    )


def downgrade():
    op.drop_index("ix_review_subject_type_status", table_name="review")
    op.drop_table("review")
