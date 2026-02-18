# check_db.py
import sqlite3

def check_database():
    # Database connect karein
    conn = sqlite3.connect('instance/eventify.db')
    c = conn.cursor()
    
    # All tables get karein
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [table[0] for table in c.fetchall()]
    
    print('📊 CURRENT TABLES IN DATABASE:')
    for table in sorted(tables):
        print(f'   - {table}')
    
    # Check payment_request table
    if 'payment_request' in tables:
        print('\n✅ payment_request table EXISTS!')
    else:
        print('\n❌ payment_request table MISSING!')
    
    conn.close()

if __name__ == "__main__":
    check_database()