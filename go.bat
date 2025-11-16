@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Starting RSVP Management System
echo ========================================
echo.

REM Install frontend dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    call npm install
    echo.
)

echo [INFO] Starting frontend server...
echo [INFO] Frontend: http://localhost:5173/
echo [INFO] WhatsApp messages will open in browser
echo [INFO] Press Ctrl+C to stop
echo ========================================
echo.

REM Start frontend server
call npm run dev || npx vite

pause
