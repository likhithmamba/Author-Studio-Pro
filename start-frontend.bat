@echo off
echo ========================================
echo  Author Studio Pro — Frontend Server
echo ========================================
echo.
cd /d "%~dp0"
echo Starting frontend on http://localhost:5173 ...
echo Press Ctrl+C to stop.
echo.
npm run dev
pause
