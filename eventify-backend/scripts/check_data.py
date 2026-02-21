from app import create_app
from app.models import Event, User

app = create_app()
with app.app_context():
    events = Event.query.all()
    print("\n--- Event Assignment Status ---")
    for e in events:
        org_name = e.organizer.name if e.organizer else "None"
        vendors = [v.name for v in e.assigned_vendors.all()]
        print(f"Event: {e.name} (ID: {e.id})")
        print(f"  Organizer: {org_name} (ID: {e.organizer_id})")
        print(f"  Vendors: {vendors}")
        print("-" * 30)
