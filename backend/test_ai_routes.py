import sys
import os
import json
import pytest
import asyncio
from unittest.mock import patch, MagicMock

# We use patch.dict to patch sys.modules without permanently modifying global test environment
@pytest.fixture(autouse=True)
def mock_fastapi_modules():
    class MockHTTPException(Exception):
        def __init__(self, status_code, detail=None):
            self.status_code = status_code
            self.detail = detail

    mock_fastapi = MagicMock()
    mock_fastapi.HTTPException = MockHTTPException
    # Essential for testing router decorators
    mock_fastapi.APIRouter = lambda *args, **kwargs: MagicMock(
        post=lambda *a, **kw: lambda f: f,
        get=lambda *a, **kw: lambda f: f,
        put=lambda *a, **kw: lambda f: f,
        delete=lambda *a, **kw: lambda f: f
    )
    mock_fastapi.Depends = lambda x: x

    mock_pydantic = MagicMock()
    mock_pydantic.BaseModel = MagicMock

    class MockLimiter:
        def limit(self, *args, **kwargs):
            def decorator(func):
                return func
            return decorator

    mock_slowapi = MagicMock()
    mock_slowapi.Limiter = MockLimiter

    class MockRequests:
        @staticmethod
        def post(*args, **kwargs):
            mock_response = MagicMock()
            mock_response.json.return_value = {"choices": [{"message": {"content": "{}"}}]}
            mock_response.raise_for_status = MagicMock()
            return mock_response
        class exceptions:
            Timeout = Exception

    class MockRateLimiterModule:
        limiter = MockLimiter()

    mocks = {
        'fastapi': mock_fastapi,
        'fastapi.security': MagicMock(),
        'fastapi.responses': MagicMock(),
        'fastapi.testclient': MagicMock(),
        'starlette': MagicMock(),
        'starlette.concurrency': MagicMock(),
        'pydantic': mock_pydantic,
        'slowapi': mock_slowapi,
        'slowapi.util': MagicMock(),
        'requests': MockRequests,
        'rate_limiter': MockRateLimiterModule(),
    }

    with patch.dict(sys.modules, mocks):
        yield

def test_analyze_signals_path_traversal():
    """Verify that the analyze-signals endpoint prevents path traversal in 'mode'."""
    # We must import the routes inside the test AFTER the mock fixture has yielded
    from routers.ai_routes import analyze_signals, SignalAnalysisRequest

    request_mock = MagicMock()

    # Test with a malicious path traversal attempt
    body = SignalAnalysisRequest()
    body.mode="../routers/ai_routes"
    body.signals=[{"type": "test"}]
    body.api_key="fake-key"
    body.current_phase="setup"
    body.progression=None
    body.character_states=None
    body.conflict_states=None
    body.ai_model="mistralai/mistral-7b-instruct:free"

    # We patch os.path.exists and open to catch what it tries to open
    with patch('os.path.exists', return_value=True), \
         patch('builtins.open', MagicMock()) as mock_open:

        # mock f.read() to return a mock string
        mock_file = MagicMock()
        mock_file.read.return_value = "{{signals_json}}{{primary_signals_json}}{{secondary_signals_json}}{{current_phase}}{{full_sso_json}}{{signal_history_json}}{{character_evolution_json}}{{conflict_evolution_json}}"
        mock_open.return_value.__enter__.return_value = mock_file

        asyncio.run(analyze_signals(request_mock, body))

        # Verify it fell back to 'normal' instead of using the traversal path
        mock_open.assert_called_with('prompt_templates/normal.txt', 'r', encoding='utf-8')

    # Test with a valid mode
    body = SignalAnalysisRequest()
    body.mode="extended"
    body.signals=[{"type": "test"}]
    body.api_key="fake-key"
    body.current_phase="setup"
    body.progression=None
    body.character_states=None
    body.conflict_states=None
    body.ai_model="mistralai/mistral-7b-instruct:free"

    with patch('os.path.exists', return_value=True), \
         patch('builtins.open', MagicMock()) as mock_open:

        mock_file = MagicMock()
        mock_file.read.return_value = "{{signals_json}}{{primary_signals_json}}{{secondary_signals_json}}{{current_phase}}{{full_sso_json}}{{signal_history_json}}{{character_evolution_json}}{{conflict_evolution_json}}"
        mock_open.return_value.__enter__.return_value = mock_file

        asyncio.run(analyze_signals(request_mock, body))

        # Verify it used the valid mode
        mock_open.assert_called_with('prompt_templates/extended.txt', 'r', encoding='utf-8')
