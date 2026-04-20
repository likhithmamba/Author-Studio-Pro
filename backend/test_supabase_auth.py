import os
import sys
from dotenv import load_dotenv
sys.path.insert(0, 'D:\\Lib\\site-packages')
load_dotenv()

from database import get_supabase, get_user_by_email, create_user
from auth import get_password_hash

def run_tests():
    sb = get_supabase()
    if not sb:
        print("ERROR: Supabase client is None")
        return
        
    print("--- Testing Users Table ---")
    try:
        res = sb.table("users").select("*").execute()
        print(f"Users table count: {len(res.data)}")
        for i, user in enumerate(res.data):
            print(f"User {i+1}: {user['email']} (ID: {user['id']})")
    except Exception as e:
        print(f"FAILED fetching users: {e}")

    test_email = "supertest@example.com"
    print(f"\n--- Testing Registration for {test_email} ---")
    existing = get_user_by_email(test_email)
    if existing:
        print("User already exists, deleting for fresh test...")
        sb.table("users").delete().eq("email", test_email).execute()
    
    try:
        new_pwd = get_password_hash("password123")
        user = create_user(test_email, new_pwd)
        print(f"SUCCESS: Created user {user['email']} with ID {user['id']}")
    except Exception as e:
        print(f"FAILED creating user: {e}")

    print("\n--- Testing Login Lookup ---")
    try:
        looked_up = get_user_by_email(test_email)
        if looked_up:
            print(f"SUCCESS: Found newly created user {looked_up['email']}")
        else:
            print("FAILED: Could not find user after creation")
    except Exception as e:
        print(f"FAILED fetching user: {e}")

if __name__ == "__main__":
    run_tests()
