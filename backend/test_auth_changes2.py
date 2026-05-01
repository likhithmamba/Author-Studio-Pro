import sys
from unittest.mock import MagicMock
sys.modules['fastapi'] = MagicMock()
sys.modules['fastapi.security'] = MagicMock()
sys.modules['slowapi'] = MagicMock()
sys.modules['slowapi.errors'] = MagicMock()
sys.modules['pydantic'] = MagicMock()
sys.modules['dotenv'] = MagicMock()
sys.modules['jose'] = MagicMock()
sys.modules['bcrypt'] = MagicMock()
sys.modules['supabase'] = MagicMock()

import database
import routers.auth_routes as auth_routes
import routers.thinking_routes as thinking_routes

print("Thinking Routes Loaded")
