# cleanup_tables.py
import sqlite3

def cleanup_database():
    conn = sqlite3.connect('instance/eventify.db')
    cursor = conn.cursor()
    
    print("🔄 Cleaning up duplicate tables...")
    
    # Delete duplicate tables
    cursor.execute("DROP TABLE IF EXISTS payment_requests")
    cursor.execute("DROP TABLE IF EXISTS payments")
    
    # Verify remaining tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [table[0] for table in cursor.fetchall()]
    
    print('📊 CLEANED TABLES:')
    for table in sorted(tables):
        print(f'   - {table}')
    
    conn.commit()
    conn.close()
    print('✅ Extra tables removed successfully!')

if __name__ == "__main__":
    cleanup_database()