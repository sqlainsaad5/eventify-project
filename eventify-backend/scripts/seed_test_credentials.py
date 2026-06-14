"""
Create or update fixed test accounts for local QA.

Usage (from eventify-backend):
    python scripts/seed_test_credentials.py

Login credentials (all use password: Test1234!)
  user@eventify.test       — role: user (event host)
  organizer@eventify.test — role: organizer
  vendor@eventify.test     — role: vendor

Admin uses .env ADMIN_EMAIL / ADMIN_PASSWORD (default admin@eventify.com / admin1234).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.models import User

TEST_PASSWORD = "Test1234!"

TEST_ACCOUNTS = [
    {
        "name": "Test Host",
        "email": "user@eventify.test",
        "role": "user",
        "city": "Islamabad",
        "phone": "+92-300-1110001",
    },
    {
        "name": "Test Organizer",
        "email": "organizer@eventify.test",
        "role": "organizer",
        "city": "Lahore",
        "phone": "+92-300-2220002",
        "organizer_availability": "available",
        "organizer_package_summary": "Full wedding & corporate packages for testing.",
    },
    {
        "name": "Test Vendor",
        "email": "vendor@eventify.test",
        "role": "vendor",
        "city": "Karachi",
        "phone": "+92-300-3330003",
        "category": "Catering",
    },
]


def upsert_test_user(spec: dict) -> User:
    email = spec["email"].strip().lower()
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(email=email, role=spec["role"])
        db.session.add(user)

    user.name = spec["name"]
    user.role = spec["role"]
    user.city = spec.get("city")
    user.phone = spec.get("phone")
    user.category = spec.get("category")
    user.organizer_availability = spec.get("organizer_availability")
    user.organizer_package_summary = spec.get("organizer_package_summary")
    user.is_verified = True
    user.is_active = True
    user.set_password(TEST_PASSWORD)
    return user


def ensure_admin_from_env() -> None:
    admin_email = (os.getenv("ADMIN_EMAIL") or "admin@eventify.com").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD") or "admin1234"
    admin = User.query.filter_by(email=admin_email).first()
    if not admin:
        admin = User(name="Admin", email=admin_email, role="admin")
        db.session.add(admin)
    admin.role = "admin"
    admin.is_verified = True
    admin.is_active = True
    admin.set_password(admin_password)
    print(f"  admin     | {admin_email} | {admin_password}")


def main() -> None:
    app = create_app()
    with app.app_context():
        db.create_all()
        print("Seeding test credentials...\n")
        print("  Role      | Email                    | Password")
        print("  ----------|--------------------------|-------------")
        ensure_admin_from_env()
        for spec in TEST_ACCOUNTS:
            upsert_test_user(spec)
            print(f"  {spec['role']:<9} | {spec['email']:<24} | {TEST_PASSWORD}")
        db.session.commit()
        print("\nDone. All test accounts are verified and active.")


if __name__ == "__main__":
    main()
