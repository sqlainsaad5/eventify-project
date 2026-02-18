from app import create_app
from app.extensions import db
from app.models import User

app = create_app()

with app.app_context():
    admin = User(name="Admin User", email="admin@example.com", role="admin")
    admin.set_password("123456")

    organizer = User(name="Organizer User", email="organizer@example.com", role="organizer")
    organizer.set_password("123456")

    vendor = User(name="Vendor User", email="vendor@example.com", role="vendor")
    vendor.set_password("123456")

    db.session.add_all([admin, organizer, vendor])
    db.session.commit()
    print("✅ Test users added successfully!")
