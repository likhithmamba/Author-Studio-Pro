import pytest
import json
import io
import zipfile
from fastapi.testclient import TestClient
from main import app
from unittest.mock import patch, MagicMock

client = TestClient(app)

def test_health():
    """Verify health endpoint works."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_templates():
    """Verify templates endpoint works."""
    response = client.get("/api/templates")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@patch("routers.ai_routes._build_zip")
def test_manual_query_endpoint(mock_build_zip):
    """Verify manual query endpoint with mocked ZIP generation."""
    # Mock the ZIP generation to avoid needing the full author_studio logic in this specific unit test
    # (Though we could also test the real logic if we wanted to)
    mock_build_zip.return_value = b"PK\x03\x04fakezipcontent"
    
    data = {"title": "Test Title", "author_name": "Test Author", "word_count": 80000}
    # Note: query/manual uses Form data for the 'data' field
    response = client.post("/api/query/manual", data={"data": json.dumps(data)})
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert response.content == b"PK\x03\x04fakezipcontent"

def test_genres():
    """Verify genres endpoint works."""
    response = client.get("/api/genres")
    assert response.status_code == 200
    assert "fantasy" in response.json()

@patch("routers.auth_routes.get_user_by_email")
@patch("routers.auth_routes.create_user")
def test_register_endpoint(mock_create, mock_get_email):
    """Verify registration endpoint with mocked DB."""
    # Mock user doesn't exist
    mock_get_email.return_value = None
    # Mock creation success
    mock_create.return_value = {
        "id": "new-user-id",
        "email": "test@example.com",
        "created_at": "2026-04-06T00:00:00Z"
    }
    
    payload = {"email": "test@example.com", "password": "securepassword123"}
    response = client.post("/api/auth/register", json=payload)
    
    assert response.status_code == 200
    assert "token" in response.json()
    assert response.json()["user"]["email"] == "test@example.com"
