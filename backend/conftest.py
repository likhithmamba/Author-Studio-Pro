"""
Shared pytest fixtures for Author Studio Pro backend tests.
"""
import os
import pytest
from unittest.mock import patch, MagicMock

# Ensure CI env vars are set for modules that import at load time
os.environ.setdefault("JWT_SECRET_KEY", "ci-test-secret-key-do-not-use-in-prod")
os.environ.setdefault("SUPABASE_URL", "https://placeholder.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "placeholder")


@pytest.fixture
def mock_supabase():
    """Patch the Supabase client so no real HTTP calls are made."""
    import database
    # Reset the cached client so our mock takes effect
    original_client = database._client
    database._client = None

    with patch("database.create_client") as mock_create:
        client = MagicMock()
        # Generic table().select().*.execute() chain
        execute_result = MagicMock()
        execute_result.data = []
        (
            client.table.return_value
            .select.return_value
            .eq.return_value
            .execute.return_value
        ) = execute_result
        (
            client.table.return_value
            .select.return_value
            .limit.return_value
            .execute.return_value
        ) = execute_result
        (
            client.table.return_value
            .insert.return_value
            .execute.return_value
        ) = execute_result

        mock_create.return_value = client
        yield client

    # Restore original cached client
    database._client = original_client
