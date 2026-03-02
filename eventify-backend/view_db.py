import sqlite3

conn = sqlite3.connect('instance/dev.db')
cur = conn.cursor()

# List all tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print('Tables:', tables)
print()

# User rows
cur.execute('SELECT * FROM user')
cols = [d[1] for d in cur.description]
print('--- User ---', cols)
for row in cur.fetchall():
    print(row)
print()

# Event rows
cur.execute('SELECT * FROM event')
cols = [d[1] for d in cur.description]
print('--- Event ---', cols)
for row in cur.fetchall():
    print(row)

conn.close()
print('Done.')
