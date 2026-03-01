@echo off
echo ========================================
echo  Author Studio Pro — Backend Server
echo ========================================
echo.
cd /d "%~dp0backend"
echo Starting backend on http://localhost:8000 ...
echo Press Ctrl+C to stop.
echo.
python -m uvicorn main:app --reload --port 8000 --log-level info
pause
