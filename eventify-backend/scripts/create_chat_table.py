# create_chat_table.py
import sqlite3
import os

def create_chat_table():
    # Connect to your SQLite database
    db_path = 'instance/eventify.db'  # Adjust path if different
    if not os.path.exists(db_path):
        print("❌ Database file not found. Make sure your Flask app has created the database first.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create the chat_message table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chat_message (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                event_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES user (id),
                FOREIGN KEY (receiver_id) REFERENCES user (id),
                FOREIGN KEY (event_id) REFERENCES event (id)
            )
        ''')
        
        print("✅ chat_message table created successfully!")
        
        # Verify the table was created
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_message'")
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
    create_chat_table()