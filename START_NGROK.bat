@echo off
chcp 65001 >nul
title ngrok Tunnel - Port 3002
color 0A

echo.
echo ========================================
echo   ngrok Tunnel - Port 3002
echo   Starting tunnel for WhatsApp Webhook
echo ========================================
echo.

REM Check ngrok
where ngrok >nul 2>&1
if errorlevel 1 (
    echo [ERROR] ngrok is not installed!
    echo Please install ngrok from https://ngrok.com/download
    pause
    exit /b 1
)

REM Stop existing ngrok processes
echo [INFO] Stopping existing ngrok processes...
taskkill /F /IM ngrok.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [INFO] Starting ngrok tunnel...
echo [INFO] This will create a public URL for your backend
echo [INFO] Copy the 'Forwarding' URL and use it in Meta Webhook configuration
echo.
echo ========================================
echo.

REM Start ngrok with pooling enabled to allow multiple instances
ngrok http 3002 --pooling-enabled

pause

