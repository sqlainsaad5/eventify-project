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
