"""
Author Studio Pro — Backend Health Check
Run this BEFORE testing in the browser to confirm everything works.
Usage: python test_auth.py
"""
import traceback, os, sys, json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"

def test(name, fn):
    try:
        result = fn()
        print(f"  {GREEN}[OK]{RESET} {name}: {result}", flush=True)
        return True
    except Exception as e:
        print(f"  {RED}[FAIL]{RESET} {name}: {e}", flush=True)
        traceback.print_exc()
        return False

print(f"\n{BOLD}{'='*50}", flush=True)
print(" Author Studio Pro — Backend Health Check", flush=True)
print(f"{'='*50}{RESET}\n", flush=True)

all_ok = True

# 1. Test bcrypt
print(f"{YELLOW}[1/5]{RESET} Password hashing (bcrypt)...", flush=True)
ok = test("Hash + verify", lambda: (
    __import__("auth").verify_password(
        "TestPass123",
        __import__("auth").get_password_hash("TestPass123")
    ) and "PASS"
))
all_ok = all_ok and ok

# 2. Test JWT
print(f"\n{YELLOW}[2/5]{RESET} JWT tokens...", flush=True)
ok = test("Create + verify token", lambda: (
    __import__("auth").verify_token(
        __import__("auth").create_access_token("test-id", "test@test.com")
    ) and "PASS"
))
all_ok = all_ok and ok

# 3. Test Supabase connection
print(f"\n{YELLOW}[3/5]{RESET} Supabase connection...", flush=True)
ok = test("Connect to Supabase", lambda: (
    __import__("database").get_supabase() and "CONNECTED"
))
all_ok = all_ok and ok

# 4. Test Supabase tables
print(f"\n{YELLOW}[4/5]{RESET} Database tables...", flush=True)
ok = test("Query users table", lambda: (
    str(__import__("database").get_supabase().table("users").select("*").limit(1).execute().data is not None)
    and "OK"
))
all_ok = all_ok and ok

ok2 = test("Query subscriptions table", lambda: (
    str(__import__("database").get_supabase().table("subscriptions").select("*").limit(1).execute().data is not None)
    and "OK"
))
all_ok = all_ok and ok2

# 5. Test full registration flow
print(f"\n{YELLOW}[5/5]{RESET} Full registration flow...", flush=True)
def test_register():
    from auth import get_password_hash, create_access_token
    from database import create_user, get_user_by_email
    
    email = "healthcheck@test.com"
    existing = get_user_by_email(email)
    if existing:
        return f"User exists (id={existing['id'][:8]}...)"
    
    h = get_password_hash("TestPass123!")
    user = create_user(email, h)
    token = create_access_token(user["id"], user["email"])
    return f"Registered OK, token={token[:20]}..."

ok = test("Register user", test_register)
all_ok = all_ok and ok

# Summary
print(f"\n{BOLD}{'='*50}", flush=True)
if all_ok:
    print(f" {GREEN}ALL TESTS PASSED ✓{RESET}", flush=True)
    print(f" Backend is healthy. Start the server with:", flush=True)
    print(f" python -m uvicorn main:app --reload --port 8000", flush=True)
else:
    print(f" {RED}SOME TESTS FAILED ✗{RESET}", flush=True)
    print(f" Fix the issues above before starting the server.", flush=True)
print(f"{'='*50}\n", flush=True)
