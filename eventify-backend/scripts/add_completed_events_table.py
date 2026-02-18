import sqlite3
import os

def add_completed_events_table():
    # Connect to your SQLite database
    db_path = 'instance/eventify.db'  # Adjust path if different
    if not os.path.exists(db_path):
        print("❌ Database file not found. Make sure your Flask app has created the database first.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create the vendor_completed_events table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vendor_completed_events (
                vendor_id INTEGER NOT NULL,
                event_id INTEGER NOT NULL,
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (vendor_id, event_id),
                FOREIGN KEY (vendor_id) REFERENCES user (id),
                FOREIGN KEY (event_id) REFERENCES event (id)
            )
        ''')
        
        print("✅ vendor_completed_events table created successfully!")
        
        # Verify the table was created
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='vendor_completed_events'")
        result = cursor.fetchone()
        
        if result:
            print("✅ Table verification successful!")
        else:
            print("❌ Table creation failed!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.commit()
        conn.close()

if __name__ == "__main__":
    add_completed_events_table()