@echo off
echo 🚀 Starting Server from Correct Directory...
echo.

REM Change to the correct project directory
cd /d "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\--------------------"

echo 📁 Current directory: %CD%
echo.

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
