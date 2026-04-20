import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"Connecting to {url}...")
try:
    sb = create_client(url, key)
    # Test 'users' table
    res = sb.table("users").select("count", count="exact").limit(1).execute()
    print(f"Success! Users count: {res.count}")
except Exception as e:
    print(f"FAILED: {e}")
