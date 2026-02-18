# create_missing_tables.py
import os
import sys
sys.path.append(os.getcwd())

from app import create_app, db
from app.models import PaymentRequest, Payment

def create_missing_tables():
    app = create_app()
    
    with app.app_context():
        print("🔄 Creating missing tables...")
        
        # Create all tables (including missing ones)
        db.create_all()
        
        # Check current tables
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        print('📊 CURRENT TABLES:')
        for table in sorted(tables):
            print(f'   - {table}')
        
        # Verify payment_request table
        if 'payment_request' in tables:
            print('✅ payment_request table created successfully!')
        else:
            print('❌ payment_request table still missing!')

if __name__ == "__main__":
    create_missing_tables()