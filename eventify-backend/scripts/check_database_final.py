import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 Checking database structure...")
    
    # Import database
    from app.extensions import db
    from app import create_app
    
    app = create_app()
    
    with app.app_context():
        print("✅ App context loaded successfully!")
        print("\n📋 YOUR CURRENT DATABASE TABLES:")
        
        # Get all tables
        inspector = db.inspect(db.engine)
        tables = inspector.get_table_names()
        
        if tables:
            for table in tables:
                print(f"   ✅ {table}")
                
                # Show columns for each table
                columns = inspector.get_columns(table)
                for column in columns:
                    print(f"      └─ {column['name']} ({column['type']})")
        else:
            print("   ❌ No tables found in database")
            
        print(f"\n🎯 Total Tables: {len(tables)}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    print("\n💡 Please install missing dependencies:")
    print("pip install openai")