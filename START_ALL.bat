@echo off
chcp 65001 >nul
title WhatsApp Backend + ngrok
color 0B

cd /d "%~dp0"

echo.
echo ========================================
echo   WhatsApp Backend + ngrok Tunnel
echo   Starting both services...
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

REM Check ngrok
where ngrok >nul 2>&1
if errorlevel 1 (
    echo [ERROR] ngrok is not installed!
    echo Please install ngrok from https://ngrok.com/download
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "whatsapp-backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd whatsapp-backend
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install backend dependencies!
        pause
        exit /b 1
    )
    cd ..
    echo.
)

echo [INFO] Starting backend server...
start "WhatsApp Backend" cmd /k "cd whatsapp-backend && node server.js"

echo [INFO] Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo [INFO] Starting ngrok tunnel...
echo [INFO] This will open a new window with ngrok
echo [INFO] Copy the 'Forwarding' URL from ngrok window
echo [INFO] Example: https://abc123.ngrok-free.app
echo.
echo ========================================
echo.
echo [INFO] Your Webhook URL will be:
echo       https://YOUR_NGROK_URL.ngrok-free.app/api/whatsapp/webhook
echo.
echo [INFO] Verify Token:
echo       whatsapp_webhook_verify_token_2024
echo.
echo ========================================
echo.

REM Start ngrok in a new window
start "ngrok Tunnel" cmd /k "ngrok http 3002"

echo [INFO] Both services are starting...
echo [INFO] Check the ngrok window for your public URL
echo [INFO] Then configure it in Meta Developers Console
echo.
pause
