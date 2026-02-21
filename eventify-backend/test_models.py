from app import create_app
from app.models import Event, User
from app.extensions import db

app = create_app()
with app.app_context():
    try:
        user = User.query.first()
        if user:
            print(f"User found: {user.name}")
            data = user.to_dict()
            print("User.to_dict() success")
        
        event = Event.query.first()
        if event:
            print(f"Event found: {event.name}")
            data = event.to_dict()
            print("Event.to_dict() success")
            
        print("Test passed!")
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
