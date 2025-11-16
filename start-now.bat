@echo off
cd /d "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\--------------------"
echo Starting from: %CD%
echo Files here:
dir /b
echo.
echo Starting Vite...
npx vite --host 0.0.0.0 --port 5173
