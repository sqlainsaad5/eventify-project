"""Apply lightweight DB patches when Alembic was not run (e.g. local SQLite)."""

from sqlalchemy import inspect, text

from .extensions import db


def ensure_user_organizer_columns(app) -> None:
    """Add user.organizer_* columns if missing (matches models + migrations)."""
    with app.app_context():
        try:
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            if "user" not in tables:
                return
            cols = {c["name"] for c in inspector.get_columns("user")}
            with db.engine.begin() as conn:
                if "organizer_availability" not in cols:
                    conn.execute(
                        text(
                            "ALTER TABLE user ADD COLUMN organizer_availability VARCHAR(32)"
                        )
                    )
                if "organizer_package_summary" not in cols:
                    conn.execute(
                        text(
                            "ALTER TABLE user ADD COLUMN organizer_package_summary TEXT"
                        )
                    )
        except Exception as ex:
            app.logger.warning("ensure_user_organizer_columns: %s", ex)


def ensure_budget_plan_table(app) -> None:
    """Create budget_plan_item if missing (matches models + migrations)."""
    with app.app_context():
        try:
            from app.models.models import BudgetPlanItem

            BudgetPlanItem.__table__.create(bind=db.engine, checkfirst=True)
        except Exception as ex:
            app.logger.warning("ensure_budget_plan_table: %s", ex)


def ensure_vendor_events_partnership_columns(app) -> None:
    """Add vendor_events partnership columns for approve-before-assign flow (SQLite / dev)."""
    with app.app_context():
        try:
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            if "vendor_events" not in tables:
                return
            cols = {c["name"] for c in inspector.get_columns("vendor_events")}
            with db.engine.begin() as conn:
                if "partnership_status" not in cols:
                    conn.execute(
                        text(
                            "ALTER TABLE vendor_events ADD COLUMN partnership_status VARCHAR(20) NOT NULL DEFAULT 'accepted'"
                        )
                    )
                    conn.execute(
                        text(
                            "UPDATE vendor_events SET partnership_status = 'accepted' "
                            "WHERE partnership_status IS NULL OR TRIM(COALESCE(partnership_status, '')) = ''"
                        )
                    )
                if "partnership_confirmed_at" not in cols:
                    conn.execute(
                        text(
                            "ALTER TABLE vendor_events ADD COLUMN partnership_confirmed_at DATETIME"
                        )
                    )
                    conn.execute(
                        text(
                            "UPDATE vendor_events SET partnership_confirmed_at = assigned_at "
                            "WHERE partnership_status = 'accepted' AND partnership_confirmed_at IS NULL"
                        )
                    )
        except Exception as ex:
            app.logger.warning("ensure_vendor_events_partnership_columns: %s", ex)


def ensure_event_timestamps(app) -> None:
    """Add event.created_at / event.updated_at if missing (SQLite and others without Alembic)."""
    with app.app_context():
        try:
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            if "event" not in tables:
                return
            cols = {c["name"] for c in inspector.get_columns("event")}
            with db.engine.begin() as conn:
                if "created_at" not in cols:
                    conn.execute(
                        text("ALTER TABLE event ADD COLUMN created_at DATETIME")
                    )
                if "updated_at" not in cols:
                    conn.execute(
                        text("ALTER TABLE event ADD COLUMN updated_at DATETIME")
                    )
                conn.execute(
                    text(
                        "UPDATE event SET created_at = CURRENT_TIMESTAMP "
                        "WHERE created_at IS NULL"
                    )
                )
                conn.execute(
                    text(
                        "UPDATE event SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP) "
                        "WHERE updated_at IS NULL"
                    )
                )
        except Exception as ex:
            app.logger.warning("ensure_event_timestamps: %s", ex)
