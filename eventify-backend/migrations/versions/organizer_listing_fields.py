"""organizer availability and package summary for host-facing picker

Revision ID: organizer_listing_fields
Revises: reviews_schema
Create Date: 2026-04-20

"""
from alembic import op
import sqlalchemy as sa


revision = "organizer_listing_fields"
down_revision = "reviews_schema"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.add_column(sa.Column("organizer_availability", sa.String(length=32), nullable=True))
        batch_op.add_column(sa.Column("organizer_package_summary", sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.drop_column("organizer_package_summary")
        batch_op.drop_column("organizer_availability")
