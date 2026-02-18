import sqlite3

conn = sqlite3.connect('instance/eventify.db')
c = conn.cursor()
c.execute('CREATE TABLE IF NOT EXISTS payment_request (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER, vendor_id INTEGER, amount REAL, status TEXT, description TEXT, created_at DATETIME)')
conn.commit()
conn.close()
print('DONE')