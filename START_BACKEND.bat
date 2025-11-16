@echo off
chcp 65001 >nul
title WhatsApp Backend Server
color 0B

cd /d "%~dp0"

echo.
echo ========================================
echo   WhatsApp Backend Server
echo   Starting on port 3002
echo ========================================
echo.

REM Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Navigate to backend directory
if exist "whatsapp-backend" (
    cd whatsapp-backend
) else (
    echo [ERROR] whatsapp-backend directory not found!
    pause
    exit /b 1
)

REM Check if node_modules exists
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

REM Check if port 3002 is in use and kill the process
echo [INFO] Checking if port 3002 is in use...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002 ^| findstr LISTENING') do (
    echo [INFO] Found process using port 3002: %%a
    echo [INFO] Stopping process %%a...
    taskkill /F /PID %%a >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Failed to stop process %%a - you may need to run as administrator
    ) else (
        echo [INFO] Successfully stopped process %%a
    )
    timeout /t 2 /nobreak >nul
)

echo [INFO] Starting WhatsApp Backend on http://localhost:3002/
echo [INFO] Webhook endpoint: http://localhost:3002/api/whatsapp/webhook
echo [INFO] Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

REM Start the backend server
call npm start

pause
