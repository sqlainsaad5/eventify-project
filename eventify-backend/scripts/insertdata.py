from app import create_app
from app.extensions import db
from app.models import User, Event

app = create_app()

with app.app_context():
    # Create tables if they don't exist
    db.create_all()

    # --- Create default admin ---
    admin_email = "admin@eventify.com"
    existing_admin = User.query.filter_by(email=admin_email).first()
    if not existing_admin:
        admin = User(
            name="Admin",
            email=admin_email,
            role="admin"  # 👈 admin role
        )
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()
        print(f"✅ Admin created: {admin.email} / password: admin123")
    else:
        print("⚠️ Admin already exists")

    # --- Create a test organizer user ---
    user_email = "saadamjad@gmail.com"
    existing_user = User.query.filter_by(email=user_email).first()
    if not existing_user:
        user1 = User(
            name="Saad Amjad",
            email=user_email,
            role="organizer"  # 👈 organizer role
        )
        user1.set_password("123456")
        db.session.add(user1)
        db.session.commit()
        print(f"✅ Organizer created: {user1.email} / password: 123456")
    else:
        user1 = existing_user
        print("⚠️ Organizer already exists")

    # --- Create a test event for this user ---
    existing_event = Event.query.filter_by(name="Birthday Party", user_id=user1.id).first()
    if not existing_event:
        event1 = Event(
            name="Birthday Party",
            date="2025-12-25",
            venue="Islamabad",
            budget=5000.0,
            vendor_category="Catering",
            image_url="https://example.com/event1.jpg",
            progress=50,
            user_id=user1.id
        )
        db.session.add(event1)
        db.session.commit()
        print(f"🎉 Event created with id: {event1.id}")
    else:
        print("⚠️ Test event already exists")
