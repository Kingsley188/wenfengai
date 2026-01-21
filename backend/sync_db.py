
import os
import sys

# Add current directory to path so we can import models
sys.path.append(os.getcwd())

from database import engine, Base
from models import User, PPT
from sqlalchemy import text

def init_db():
    print("🚀 Starting database initialization...")
    try:
        # Check if tables exist
        with engine.connect() as conn:
            result = conn.execute(text("SHOW TABLES"))
            tables = [row[0] for row in result]
            print(f"📊 Current tables in DB: {tables}")

        # Create tables
        print("🛠 Creating tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully!")
        
        # Verify again
        with engine.connect() as conn:
            result = conn.execute(text("SHOW TABLES"))
            tables = [row[0] for row in result]
            print(f"📊 Tables after init: {tables}")
            
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    init_db()
