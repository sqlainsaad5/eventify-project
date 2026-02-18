import sys
from app import create_app
from app.extensions import db
from app.models import User

app = create_app()

def list_vendors():
    with app.app_context():
        vendors = User.query.filter_by(role='vendor').all()
        print("\n📋 REGISTERED VENDORS:")
        print(f"{'ID':<5} {'Name':<20} {'Email':<30} {'City'}")
        print("-" * 70)
        for v in vendors:
            print(f"{v.id:<5} {v.name:<20} {v.email:<30} {v.city}")
        print("-" * 70)

def reset_password(email, new_password):
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if user:
            user.set_password(new_password)
            db.session.commit()
            print(f"\n✅ Password for {email} has been reset to: {new_password}")
        else:
            print(f"\n❌ User with email {email} not found.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python manage_vendors.py list")
        print("  python manage_vendors.py reset <email> <new_password>")
    elif sys.argv[1] == "list":
        list_vendors()
    elif sys.argv[1] == "reset" and len(sys.argv) == 4:
        reset_password(sys.argv[2], sys.argv[3])
    else:
        print("Invalid arguments.")
