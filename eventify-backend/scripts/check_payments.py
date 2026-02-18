# check_payments.py
import sqlite3

def check_payment_requests():
    conn = sqlite3.connect('instance/eventify.db')
    c = conn.cursor()
    
    # Check payment requests with event and organizer info
    c.execute('''
        SELECT pr.id, pr.event_id, pr.vendor_id, pr.status, 
               e.name as event_name, e.user_id as organizer_id,
               u.name as organizer_name
        FROM payment_request pr
        JOIN event e ON pr.event_id = e.id
        JOIN user u ON e.user_id = u.id
    ''')
    results = c.fetchall()
    
    print('📊 Payment Requests with Event & Organizer Info:')
    for row in results:
        print(f'   Request ID: {row[0]}, Event: {row[4]} (ID: {row[1]}), Organizer: {row[6]} (ID: {row[5]})')
    
    # Check current organizers
    c.execute('SELECT id, name FROM user WHERE role="organizer"')
    organizers = c.fetchall()
    print('\n👨‍💼 Organizers:')
    for org in organizers:
        print(f'   - {org[1]} (ID: {org[0]})')
    
    conn.close()

if __name__ == "__main__":
    check_payment_requests()