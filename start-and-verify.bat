@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Auto-Starting Server with Verification
echo ========================================
echo.

REM Verify files
if not exist "index.html" (
    echo [ERROR] index.html not found!
    pause
    exit /b 1
)

if not exist "src\main.tsx" (
    echo [ERROR] src\main.tsx not found!
    pause
    exit /b 1
)

echo [OK] All required files found
echo.

REM Start server
echo Starting server...
start /B npm run dev

REM Wait for server
echo Waiting for server to start...
timeout /t 15 /nobreak >nul

REM Test server
echo Testing server...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5173' -TimeoutSec 5 -UseBasicParsing; Write-Host '[SUCCESS] Server is working! Status:' $r.StatusCode -ForegroundColor Green; Write-Host 'Open: http://localhost:5173/' -ForegroundColor Yellow } catch { Write-Host '[FAILED] Server not responding' -ForegroundColor Red }"

echo.
echo Server is running in background.
echo Open http://localhost:5173/ in your browser
echo.
pause



