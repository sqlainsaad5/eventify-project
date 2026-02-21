import sqlite3
import os

db_path = os.path.join(os.getcwd(), 'instance', 'dev.db')

def migrate():
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Add organizer_status column if it doesn't exist
        try:
            cursor.execute("ALTER TABLE event ADD COLUMN organizer_status VARCHAR(20) DEFAULT 'pending'")
            print("Successfully added organizer_status column to event table.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("organizer_status column already exists.")
            else:
                print(f"Error adding column: {e}")
                
        conn.commit()
        conn.close()
        print("Migration completed.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
