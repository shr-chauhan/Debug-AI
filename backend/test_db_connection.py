"""
Quick script to test database connection and configuration
Run this to verify your database setup before running Alembic
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

# Get database URL (same logic as app/database.py and alembic/env.py)
if os.getenv("DATABASE_URL"):
    database_url = os.getenv("DATABASE_URL")
else:
    db_user = os.getenv("DATABASE_USER", "postgres")
    db_password = os.getenv("DATABASE_PASSWORD", "postgres")
    db_host = os.getenv("DATABASE_HOST", "localhost")
    db_port = os.getenv("DATABASE_PORT", "5432")
    db_name = os.getenv("DATABASE_NAME", "error_ingestion")
    
    database_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

# Hide password in output
safe_url = database_url.replace(f":{db_password}@", ":***@") if db_password else database_url

print(f"Database URL: {safe_url}")
print(f"Database name: {os.getenv('DATABASE_NAME', 'error_ingestion')}")
print()

try:
    engine = create_engine(database_url, pool_pre_ping=True)
    
    with engine.connect() as conn:
        # Test connection
        result = conn.execute(text("SELECT version();"))
        version = result.fetchone()[0]
        print(f"✅ Database connection successful!")
        print(f"PostgreSQL version: {version.split(',')[0]}")
        print()
        
        # Check if database exists and list tables
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """))
        tables = [row[0] for row in result.fetchall()]
        
        if tables:
            print(f"📋 Existing tables: {', '.join(tables)}")
        else:
            print("📋 No tables found in database")
        
        # Check for alembic_version table
        if 'alembic_version' in tables:
            result = conn.execute(text("SELECT version_num FROM alembic_version;"))
            version_num = result.fetchone()
            if version_num:
                print(f"⚠️  Alembic version table exists with revision: {version_num[0]}")
            else:
                print("⚠️  Alembic version table exists but is empty")
        else:
            print("✅ No alembic_version table (correct for first migration)")
            
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    print()
    print("Troubleshooting:")
    print("1. Make sure PostgreSQL is running")
    print("2. Check your .env file has correct credentials")
    print("3. Make sure the database exists: CREATE DATABASE error_ingestion;")

