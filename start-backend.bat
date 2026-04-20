@echo off
echo ========================================
echo  Author Studio Pro — Backend Server
echo ========================================
echo.
cd /d "%~dp0backend"
echo Starting backend on http://localhost:8000 ...
echo Press Ctrl+C to stop.
echo.
D:\python.exe -c "import sys; sys.path.insert(0,'D:\\Lib\\site-packages'); import uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)"
pause
