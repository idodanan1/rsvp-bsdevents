@echo off
chcp 65001 >nul
title WhatsApp Backend with Tunnel
color 0B

cd /d "%~dp0"

echo.
echo ========================================
echo   WhatsApp Backend with Tunnel
echo   Starting Backend + Tunnel
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

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing backend dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install backend dependencies!
        pause
        exit /b 1
    )
    echo.
)

REM Check if localtunnel is installed
where npx >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npx is not available!
    pause
    exit /b 1
)

echo [INFO] Starting backend server...
start "WhatsApp Backend" cmd /k "node server.js"

echo [INFO] Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo [INFO] Starting tunnel (localtunnel)...
echo [INFO] This will create a public URL for your backend
echo [INFO] Copy the URL and use it in Meta Webhook configuration
echo.
echo ========================================
echo.

REM Start localtunnel
npx localtunnel --port 3002 --subdomain whatsapp-webhook

pause

