@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Starting server...
echo.

if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

echo.
echo Starting Vite...
npm run dev

pause

