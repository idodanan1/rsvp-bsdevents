@echo off
chcp 65001 >nul
cd /d "%~dp0"

title RSVP Management System

echo.
echo ========================================
echo   RSVP Management System
echo ========================================
echo.

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting server...
echo Server will open at: http://localhost:5173/
echo Press Ctrl+C to stop
echo.

call npm run dev

pause

