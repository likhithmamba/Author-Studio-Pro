"""Run seed_demo.sql against the Supabase database via the Python client."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    sys.exit(1)

sb = create_client(url, key)

# 1. Insert demo user
print("Seeding demo user...")
try:
    sb.table("users").upsert({
        "id": "00000000-0000-0000-0000-000000000000",
        "email": "demo@example.com",
        "password_hash": "$2b$12$rmoaMSqN5lT2OPA1gddlUMOmGG6xHYgwXWthXeiOROibsGzU"
    }, on_conflict="id").execute()
    print("  OK - Demo user inserted/updated")
except Exception as e:
    print(f"  FAIL - User insert failed: {e}")

# 2. Insert demo project
print("Seeding demo project...")
try:
    sb.table("projects").upsert({
        "id": "00000000-0000-0000-0000-000000000001",
        "user_id": "00000000-0000-0000-0000-000000000000",
        "title": "My Novel"
    }, on_conflict="id").execute()
    print("  OK - Demo project inserted/updated")
except Exception as e:
    print(f"  FAIL - Project insert failed: {e}")

# 3. Insert demo chapter
print("Seeding demo chapter...")
try:
    sb.table("chapters").upsert({
        "id": "00000000-0000-0000-0000-000000000010",
        "project_id": "00000000-0000-0000-0000-000000000001",
        "user_id": "00000000-0000-0000-0000-000000000000",
        "title": "Chapter 1"
    }, on_conflict="id").execute()
    print("  OK - Demo chapter inserted/updated")
except Exception as e:
    print(f"  FAIL - Chapter insert failed: {e}")

print("\nSeed data complete! The editor should now work with the backend.")
