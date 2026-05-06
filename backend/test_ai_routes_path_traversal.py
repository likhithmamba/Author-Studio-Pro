import sys
from unittest.mock import MagicMock, patch
import asyncio

# Mock dependencies properly for FastAPI decorators
mock_fastapi = MagicMock()
mock_router = MagicMock()
mock_router.post = lambda *args, **kwargs: lambda f: f
mock_fastapi.APIRouter.return_value = mock_router

sys.modules['fastapi'] = mock_fastapi
sys.modules['fastapi.responses'] = MagicMock()
sys.modules['fastapi.security'] = MagicMock()

mock_limiter = MagicMock()
mock_limiter.limit = lambda *args, **kwargs: lambda f: f
mock_rate_limiter = MagicMock()
mock_rate_limiter.limiter = mock_limiter
sys.modules['rate_limiter'] = mock_rate_limiter

sys.modules['pydantic'] = MagicMock()
sys.modules['requests'] = MagicMock()

import os
import routers.ai_routes as ai_routes

def test_analyze_signals_path_traversal():
    """Verify that mode is constrained to the allowlist."""

    class MockRequest:
        pass

    class MockBody:
        def __init__(self, mode, api_key="dummy"):
            self.mode = mode
            self.api_key = api_key
            self.signals = []
            self.current_phase = "setup"
            self.progression = None
            self.character_states = None
            self.conflict_states = None
            self.ai_model = "test-model"

    # Mock open and json and requests
    with patch('builtins.open', new_callable=MagicMock) as mock_open:
        with patch('os.path.exists', return_value=True) as mock_exists:
            with patch('json.dumps', return_value="{}"):
                with patch('json.loads', return_value={"status": "ok"}):
                    mock_open.return_value.__enter__.return_value.read.return_value = "dummy template"

                    mock_response = MagicMock()
                    mock_response.json.return_value = {"choices": [{"message": {"content": "{}"}}]}

                    sys.modules['requests'].post.return_value = mock_response

                    # Test a legitimate mode
                    asyncio.run(ai_routes.analyze_signals(MockRequest(), MockBody("depth")))

                    # Verify it opened the right file
                    mock_open.assert_called_with("prompt_templates/depth.txt", 'r', encoding='utf-8')

                    # Reset
                    mock_open.reset_mock()

                    # Test a path traversal attempt
                    asyncio.run(ai_routes.analyze_signals(MockRequest(), MockBody("../../../etc/passwd")))

                    # Verify it fell back to normal
                    mock_open.assert_called_with("prompt_templates/normal.txt", 'r', encoding='utf-8')

if __name__ == "__main__":
    test_analyze_signals_path_traversal()
    print("Path traversal test passed!")
