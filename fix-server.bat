@echo off
chcp 65001
echo 🚀 Fixing Server Path Issue...
echo.

REM Get the directory where this batch file is located
set "PROJECT_DIR=%~dp0"
echo 📁 Project directory: %PROJECT_DIR%

REM Change to the project directory
cd /d "%PROJECT_DIR%"
echo 📁 Current directory: %CD%

REM Check if index.html exists
if exist "index.html" (
    echo ✅ Found index.html
) else (
    echo ❌ index.html not found!
    echo Files in current directory:
    dir /b
    pause
    exit /b 1
)

REM Check if package.json exists
if exist "package.json" (
    echo ✅ Found package.json
) else (
    echo ❌ package.json not found!
    pause
    exit /b 1
)

echo.
echo 🔧 Starting Vite server from correct directory...
call npx vite --host 0.0.0.0 --port 5173

pause
