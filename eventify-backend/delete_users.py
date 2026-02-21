from app import create_app
from app.extensions import db
from app.models.models import User, Event, ChatMessage, PaymentRequest, Service

# Initialize the application context so we can talk to the database
app = create_app()

with app.app_context():
    # Identify who we want to remove
    target_roles = ['organizer', 'vendor']
    
    # 1. Find the users with these roles
    users_to_delete = User.query.filter(User.role.in_(target_roles)).all()
    user_ids = [u.id for u in users_to_delete]

    if not user_ids:
        print("No organizers or vendors found to delete!")
    else:
        print(f"Cleaning data for {len(user_ids)} users...")

        # 2. DELETE RELATED DATA (Important!)
        # We must delete their messages, events, and services first
        ChatMessage.query.filter((ChatMessage.sender_id.in_(user_ids)) | (ChatMessage.receiver_id.in_(user_ids))).delete(synchronize_session=False)
        PaymentRequest.query.filter(PaymentRequest.vendor_id.in_(user_ids)).delete(synchronize_session=False)
        Service.query.filter(Service.vendor_id.in_(user_ids)).delete(synchronize_session=False)
        Event.query.filter(Event.user_id.in_(user_ids)).delete(synchronize_session=False)

        # 3. DELETE THE USERS
        # Now that their data is gone, we can safely delete the users themselves
        User.query.filter(User.role.in_(target_roles)).delete(synchronize_session=False)

        # 4. SAVE CHANGES
        db.session.commit()
        print("Done! Database is now clean of Organizers and Vendors.")