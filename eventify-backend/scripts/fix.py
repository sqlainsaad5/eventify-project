print("Starting...")
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db

app = create_app()

with app.app_context():
    try:
        print("Adding profile_image column...")
        
        # Naya method try karte hain
        with db.engine.connect() as conn:
            conn.execute(db.text('ALTER TABLE user ADD COLUMN profile_image TEXT'))
            conn.commit()
            
        print("SUCCESS! Column added")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()