@echo off
chcp 65001
echo 🚀 Starting Development Server...
echo.
cd /d "%~dp0"
echo 📁 Current directory: %CD%
echo.
echo 🔧 Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)
echo.
echo 🌐 Starting Vite server...
call npx vite --host 0.0.0.0 --port 5173
pause

