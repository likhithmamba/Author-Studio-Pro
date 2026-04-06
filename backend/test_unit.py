import pytest
from unittest.mock import MagicMock, patch
from auth import get_password_hash, verify_password, create_access_token, verify_token
from database import create_user, get_user_by_email

def test_password_hashing():
    password = "TestPass123!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong", hashed) is False

def test_jwt_tokens():
    user_id = "12345"
    email = "test@example.com"
    token = create_access_token(user_id, email)
    payload = verify_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == email

def test_register_user_mocked(mock_supabase):
    # This uses the mock_supabase fixture from conftest.py
    email = "newuser@test.com"
    pwd_hash = "hashed_pw"
    
    # Configure the mock response
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "user-uuid", "email": email}
    ]
    
    user = create_user(email, pwd_hash)
    assert user["email"] == email
    assert user["id"] == "user-uuid"

def test_get_user_by_email_mocked(mock_supabase):
    email = "exists@test.com"
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "user-uuid", "email": email}
    ]
    
    user = get_user_by_email(email)
    assert user is not None
    assert user["email"] == email
