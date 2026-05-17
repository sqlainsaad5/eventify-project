"""Add complaint table for admin moderation

Revision ID: complaints_schema
Revises: event_table_timestamps
Create Date: 2026-05-17

"""
from alembic import op
import sqlalchemy as sa


revision = "complaints_schema"
down_revision = "event_table_timestamps"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "complaint",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("complainant_id", sa.Integer(), nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=False),
        sa.Column("complaint_type", sa.String(length=40), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("attachment_urls", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("resolution_action", sa.String(length=40), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["complainant_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["event_id"], ["event.id"]),
        sa.ForeignKeyConstraint(["subject_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_complaint_status_created",
        "complaint",
        ["status", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_complaint_subject_status",
        "complaint",
        ["subject_id", "status"],
        unique=False,
    )


def downgrade():
    op.drop_index("ix_complaint_subject_status", table_name="complaint")
    op.drop_index("ix_complaint_status_created", table_name="complaint")
    op.drop_table("complaint")
