"""
API tests for event-scoped reviews (JWT + eligibility).
Run from eventify-backend: python tests/test_reviews_api.py
"""
import os
import tempfile
import unittest

_db_file = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
_db_file.close()
os.environ["DATABASE_URL"] = "sqlite:///" + _db_file.name.replace("\\", "/")

from sqlalchemy import insert  # noqa: E402

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import User, Event, Payment, vendor_completed_events  # noqa: E402
from flask_jwt_extended import create_access_token  # noqa: E402


class ReviewsAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

    def setUp(self):
        with self.app.app_context():
            db.drop_all()
            db.create_all()
            u = User(name="Host", email="host@test.com", role="user")
            u.set_password("Testpass1!")
            o = User(name="Org", email="org@test.com", role="organizer")
            o.set_password("Testpass1!")
            v = User(name="Vendor", email="vendor@test.com", role="vendor")
            v.set_password("Testpass1!")
            db.session.add_all([u, o, v])
            db.session.commit()

            ev = Event(
                name="Party",
                date="2026-01-01",
                venue="Lahore",
                budget=1000.0,
                vendor_category="Wedding",
                user_id=u.id,
                organizer_id=o.id,
                organizer_status="accepted",
                status="completed",
            )
            db.session.add(ev)
            db.session.commit()

            db.session.execute(
                insert(vendor_completed_events).values(vendor_id=v.id, event_id=ev.id)
            )
            db.session.commit()

            self.host_id = u.id
            self.org_id = o.id
            self.vendor_id = v.id
            self.event_id = ev.id

    def _token(self, user_id: int):
        with self.app.app_context():
            return create_access_token(identity=str(user_id))

    def test_user_rates_organizer_success(self):
        token = self._token(self.host_id)
        res = self.client.post(
            f"/api/events/{self.event_id}/reviews",
            json={
                "review_type": "user_to_organizer",
                "subject_id": self.org_id,
                "rating": 5,
                "comment": "Great work",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(res.status_code, 201, res.get_json())

    def test_duplicate_review_conflict(self):
        token = self._token(self.host_id)
        body = {
            "review_type": "user_to_organizer",
            "subject_id": self.org_id,
            "rating": 4,
        }
        r1 = self.client.post(
            f"/api/events/{self.event_id}/reviews",
            json=body,
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(r1.status_code, 201)
        r2 = self.client.post(
            f"/api/events/{self.event_id}/reviews",
            json=body,
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(r2.status_code, 409)

    def test_wrong_subject_for_user_review(self):
        token = self._token(self.host_id)
        res = self.client.post(
            f"/api/events/{self.event_id}/reviews",
            json={
                "review_type": "user_to_organizer",
                "subject_id": self.vendor_id,
                "rating": 3,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(res.status_code, 403)

    def test_organizer_rates_vendor_success(self):
        token = self._token(self.org_id)
        res = self.client.post(
            f"/api/events/{self.event_id}/reviews",
            json={
                "review_type": "organizer_to_vendor",
                "subject_id": self.vendor_id,
                "rating": 5,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(res.status_code, 201, res.get_json())

    def test_organizer_cannot_rate_non_completed_vendor(self):
        with self.app.app_context():
            db.session.execute(
                vendor_completed_events.delete().where(
                    vendor_completed_events.c.event_id == self.event_id
                )
            )
            db.session.commit()

        token = self._token(self.org_id)
        res = self.client.post(
            f"/api/events/{self.event_id}/reviews",
            json={
                "review_type": "organizer_to_vendor",
                "subject_id": self.vendor_id,
                "rating": 2,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(res.status_code, 403)

    def test_organizer_rates_vendor_after_vendor_settlement_payment(self):
        """Stripe vendor payout path: no vendor_completed row, but completed vendor_settlement payment."""
        with self.app.app_context():
            db.session.execute(
                vendor_completed_events.delete().where(
                    vendor_completed_events.c.event_id == self.event_id
                )
            )
            db.session.add(
                Payment(
                    event_id=self.event_id,
                    vendor_id=self.vendor_id,
                    amount=100.0,
                    currency="PKR",
                    status="completed",
                    payment_method="card",
                    payment_type="vendor_settlement",
                )
            )
            db.session.commit()

        token = self._token(self.org_id)
        res = self.client.post(
            f"/api/events/{self.event_id}/reviews",
            json={
                "review_type": "organizer_to_vendor",
                "subject_id": self.vendor_id,
                "rating": 4,
                "comment": "Solid work",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(res.status_code, 201, res.get_json())


def tearDownModule():
    try:
        os.unlink(_db_file.name)
    except OSError:
        pass


if __name__ == "__main__":
    unittest.main()
