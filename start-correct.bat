@echo off
echo 🚀 Starting Server from Correct Directory...
echo.

REM Set the correct project directory
set "PROJECT_DIR=C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\--------------------"

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
echo 🌐 Starting Vite server...
npx vite --host 0.0.0.0 --port 5173

pause

