import sqlite3
import os
from datetime import datetime

def manual_migration():
    db_path = 'instance/app.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("🔧 Starting manual migration...")
        
        # 1. Create vendor_events table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vendor_events (
                vendor_id INTEGER NOT NULL,
                event_id INTEGER NOT NULL,
                assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (vendor_id, event_id),
                FOREIGN KEY (vendor_id) REFERENCES user (id),
                FOREIGN KEY (event_id) REFERENCES event (id)
            )
        """)
        print("✅ Created vendor_events table")
        
        # 2. Check if assigned_event column exists in user table
        cursor.execute("PRAGMA table_info(user)")
        user_columns = [column[1] for column in cursor.fetchall()]
        
        if 'assigned_event' in user_columns:
            # 3. Migrate existing assignments to new table
            cursor.execute("SELECT id, assigned_event FROM user WHERE assigned_event IS NOT NULL")
            existing_assignments = cursor.fetchall()
            
            for vendor_id, event_id in existing_assignments:
                cursor.execute(
                    "INSERT OR IGNORE INTO vendor_events (vendor_id, event_id) VALUES (?, ?)",
                    (vendor_id, event_id)
                )
            print(f"✅ Migrated {len(existing_assignments)} existing assignments")
            
            # 4. Drop the old assigned_event column (optional - we can keep it for now)
            # cursor.execute("ALTER TABLE user DROP COLUMN assigned_event")
            # print("✅ Dropped assigned_event column")
        
        # 5. Add completion columns to event table
        cursor.execute("PRAGMA table_info(event)")
        event_columns = [column[1] for column in cursor.fetchall()]
        
        if 'completed' not in event_columns:
            cursor.execute("ALTER TABLE event ADD COLUMN completed BOOLEAN DEFAULT FALSE")
            print("✅ Added 'completed' column to event table")
        
        if 'completed_at' not in event_columns:
            cursor.execute("ALTER TABLE event ADD COLUMN completed_at DATETIME")
            print("✅ Added 'completed_at' column to event table")
        
        conn.commit()
        print("🎉 Manual migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    manual_migration()
