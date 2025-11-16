@echo off
echo Starting server...
cd /d "%~dp0"
echo Current directory: %CD%
echo Files here:
dir /b
echo.
echo Starting Vite...
npx vite --host 0.0.0.0 --port 5173
