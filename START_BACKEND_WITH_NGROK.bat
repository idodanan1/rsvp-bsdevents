@echo off
chcp 65001 >nul
title WhatsApp Backend with ngrok Tunnel
color 0B

cd /d "%~dp0"

echo.
echo ========================================
echo   WhatsApp Backend with ngrok Tunnel
echo   Starting Backend + ngrok Tunnel
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
echo [INFO] This will create a public URL for your backend
echo [INFO] Copy the 'Forwarding' URL and use it in Meta Webhook configuration
echo [INFO] Example: https://abc123.ngrok-free.app/api/whatsapp/webhook
echo.
echo ========================================
echo.

REM Start ngrok
ngrok http 3002

pause

