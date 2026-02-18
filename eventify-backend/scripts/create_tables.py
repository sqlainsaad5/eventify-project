import sqlite3
import os
from datetime import datetime

def create_all_tables():
    # Remove existing database to start fresh
    if os.path.exists('instance/app.db'):
        os.remove('instance/app.db')
        print("🗑️  Removed old database")
    
    # Create instance directory if it doesn't exist
    os.makedirs('instance', exist_ok=True)
    
    db_path = 'instance/app.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("🔧 Creating all tables from scratch...")
        
        # 1. Create user table
        cursor.execute("""
            CREATE TABLE user (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(120),
                email VARCHAR(120) UNIQUE NOT NULL,
                password_hash VARCHAR(255),
                role VARCHAR(50),
                city VARCHAR(100),
                phone VARCHAR(50),
                category VARCHAR(100),
                assigned_event INTEGER,
                FOREIGN KEY (assigned_event) REFERENCES event (id)
            )
        """)
        print("✅ Created user table")
        
        # 2. Create event table
        cursor.execute("""
            CREATE TABLE event (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                date VARCHAR(20) NOT NULL,
                venue VARCHAR(200) NOT NULL,
                budget FLOAT NOT NULL,
                vendor_category VARCHAR(50) NOT NULL,
                image_url VARCHAR(250),
                progress INTEGER DEFAULT 0,
                completed BOOLEAN DEFAULT FALSE,
                completed_at DATETIME,
                user_id INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES user (id)
            )
        """)
        print("✅ Created event table")
        
        # 3. Create vendor_events table (many-to-many relationship)
        cursor.execute("""
            CREATE TABLE vendor_events (
                vendor_id INTEGER NOT NULL,
                event_id INTEGER NOT NULL,
                assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (vendor_id, event_id),
                FOREIGN KEY (vendor_id) REFERENCES user (id),
                FOREIGN KEY (event_id) REFERENCES event (id)
            )
        """)
        print("✅ Created vendor_events table")
        
        # 4. Insert some sample data
        # Sample users
        cursor.execute("""
            INSERT INTO user (name, email, password_hash, role, city, phone, category) 
            VALUES 
            ('Organizer User', 'organizer@test.com', 'hashed_password', 'organizer', 'Lahore', '123456789', 'General'),
            ('Vendor 1', 'vendor1@test.com', 'hashed_password', 'vendor', 'Karachi', '987654321', 'Catering'),
            ('Vendor 2', 'vendor2@test.com', 'hashed_password', 'vendor', 'Islamabad', '555555555', 'Decoration')
        """)
        
        # Sample events
        cursor.execute("""
            INSERT INTO event (name, date, venue, budget, vendor_category, user_id) 
            VALUES 
            ('Wedding Event', '2024-12-25', 'Pearl Continental', 50000.0, 'Catering', 1),
            ('Birthday Party', '2024-11-15', 'Local Hall', 20000.0, 'Decoration', 1),
            ('Corporate Event', '2024-10-10', 'Marriott Hotel', 75000.0, 'Music', 1)
        """)
        
        print("✅ Added sample data")
        
        conn.commit()
        print("🎉 All tables created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    create_all_tables()
