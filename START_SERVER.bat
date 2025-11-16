@echo off
chcp 65001 >nul
title RSVP Management System - Server
color 0A

cd /d "%~dp0"

echo.
echo ========================================
echo   RSVP Management System
echo   Starting Development Server
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
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
)

echo [INFO] Starting server on http://localhost:5173/
echo [INFO] Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

REM Try npm run dev first
call npm run dev

REM If that fails, try npx vite directly
if errorlevel 1 (
    echo.
    echo [WARNING] npm run dev failed, trying npx vite...
    call npx vite --host 0.0.0.0 --port 5173
)

pause

