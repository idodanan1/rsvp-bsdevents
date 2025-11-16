@echo off
chcp 65001 >nul
title RSVP Server - Auto Start
color 0A

cd /d "%~dp0"

echo ========================================
echo   RSVP Management System
echo   Auto-Starting Server
echo ========================================
echo.

REM Kill existing node processes
echo Stopping existing servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Verify files
if not exist "index.html" (
    echo [ERROR] index.html not found!
    echo Current directory:
    cd
    pause
    exit /b 1
)

if not exist "package.json" (
    echo [ERROR] package.json not found!
    echo Current directory:
    cd
    pause
    exit /b 1
)

echo [OK] All files found
echo.

REM Check node_modules
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Installation failed!
        pause
        exit /b 1
    )
    echo.
)

echo Starting server...
echo Server will be at: http://localhost:5173/
echo.
echo ========================================
echo.

REM Start server in background
start /B npm run dev

REM Wait for server
echo Waiting for server to start...
timeout /t 20 /nobreak >nul

REM Test server with PowerShell
echo Testing server...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5173' -TimeoutSec 5 -UseBasicParsing; Write-Host '[SUCCESS] Server is working! Status:' $r.StatusCode -ForegroundColor Green; Write-Host '[SUCCESS] Content:' $r.Content.Length 'bytes' -ForegroundColor Green; Write-Host ''; Write-Host 'Open your browser:' -ForegroundColor Yellow; Write-Host '  http://localhost:5173/' -ForegroundColor White; Write-Host ''; Write-Host 'Server is running successfully!' -ForegroundColor Green } catch { Write-Host '[FAILED] Server not responding:' $_ -ForegroundColor Red; Write-Host 'Checking processes...' -ForegroundColor Yellow; Get-Process | Where-Object {$_.ProcessName -eq 'node'} | Select-Object Id, ProcessName | Format-Table }"

echo.
echo ========================================
echo Server is running in background.
echo Open http://localhost:5173/ in your browser
echo Press any key to exit (server will keep running)
echo ========================================
pause >nul



