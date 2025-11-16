@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Starting Server and Opening Browser
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    echo.
)

echo [INFO] Starting server in background...
start /B cmd /c "npm run dev"

echo [INFO] Waiting for server to start...
timeout /t 5 /nobreak >nul

echo [INFO] Opening browser...
start http://localhost:5173/

echo.
echo [INFO] Server is running!
echo [INFO] Browser should open automatically
echo [INFO] If not, open: http://localhost:5173/
echo.
echo [INFO] Press any key to stop the server...
pause >nul

echo [INFO] Stopping server...
taskkill /F /IM node.exe >nul 2>&1

pause

