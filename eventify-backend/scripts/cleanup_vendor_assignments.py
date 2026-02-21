from app import create_app
from app.extensions import db
from app.models import Event

def cleanup_orphaned_assignments():
    app = create_app()
    with app.app_context():
        # Find events created by users that have no organizer yet
        # According to the new logic, these should NOT have vendors assigned
        events = Event.query.filter_by(organizer_id=None).all()
        removed_count = 0
        for event in events:
            if event.assigned_vendors.count() > 0:
                print(f"Cleaning assignments for event '{event.name}' (ID: {event.id})")
                for vendor in event.assigned_vendors.all():
                    event.assigned_vendors.remove(vendor)
                    removed_count += 1
        
        db.session.commit()
        print(f"✅ Successfully removed {removed_count} orphaned vendor assignments.")

if __name__ == "__main__":
    cleanup_orphaned_assignments()
