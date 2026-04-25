import pytest
import json
import io
import zipfile
from fastapi.testclient import TestClient
from main import app
from unittest.mock import patch, MagicMock
from auth import create_access_token

client = TestClient(app)

# Helper for authenticated endpoints
def get_auth_headers():
    token = create_access_token("demo-user-001", "demo@example.com")
    return {"Authorization": f"Bearer {token}"}

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
    data = response.json()
    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
        assert any("fantasy" in str(g).lower() for g in data)
    else:
        assert "fantasy" in data

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

# ─── Story Graph (Thinking Layer) ─────────────────────────

@patch("routers.thinking_routes.get_supabase")
def test_get_nodes_endpoint(mock_sb, mock_supabase):
    """Verify nodes retrieval endpoint."""
    # Use the mock_supabase fixture (from conftest) for the database result
    mock_sb.return_value = mock_supabase 
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"id": "node-1", "label": "Character A", "type": "character"}
    ]
    
    response = client.get("/api/thinking/nodes/project-123", headers=get_auth_headers())
    assert response.status_code == 200
    assert len(response.json()["nodes"]) == 1
    assert response.json()["nodes"][0]["label"] == "Character A"

@patch("routers.thinking_routes.get_supabase")
def test_upsert_nodes_endpoint(mock_sb, mock_supabase):
    """Verify bulk node upsert endpoint."""
    mock_sb.return_value = mock_supabase
    
    payload = {
        "project_id": "project-123",
        "nodes": [
            {"id": "n1", "label": "New Node", "type": "plot", "position_x": 100, "position_y": 200}
        ]
    }
    response = client.post("/api/thinking/nodes", json=payload, headers=get_auth_headers())
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["count"] == 1

@patch("routers.thinking_routes.get_supabase")
def test_update_branch_endpoint(mock_sb, mock_supabase):
    """Verify branch update endpoint."""
    mock_sb.return_value = mock_supabase
    mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"id": "b1", "name": "Updated Branch"}
    ]
    
    response = client.put("/api/thinking/branches/b1", json={"name": "Updated Branch"}, headers=get_auth_headers())
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Branch"

@patch("routers.thinking_routes.get_supabase")
def test_manuscript_endpoints(mock_sb, mock_supabase):
    """Verify manuscript save and load endpoints."""
    mock_sb.return_value = mock_supabase
    
    # Test Save
    payload = {
        "project_id": "proj-1",
        "content": {"chapters": {"c1": {"title": "Ch 1"}}, "chapterOrder": ["c1"]}
    }
    response = client.post("/api/thinking/manuscript", json=payload, headers=get_auth_headers())
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    
    # Test Load
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"content": payload["content"]}
    ]
    response = client.get("/api/thinking/manuscript/proj-1", headers=get_auth_headers())
    assert response.status_code == 200
    assert response.json()["chapterOrder"][0] == "c1"
