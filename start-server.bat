@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   Starting RSVP Management System
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting development server...
echo Server will be available at: http://localhost:5173/
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

call npm run dev

pause

