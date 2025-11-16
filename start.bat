@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Starting RSVP Management System
echo ========================================
echo.

REM Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
)

echo [INFO] Starting server...
echo [INFO] Server: http://localhost:5173/
echo [INFO] Press Ctrl+C to stop
echo ========================================
echo.

REM Start server directly with npx vite
npx vite

pause

