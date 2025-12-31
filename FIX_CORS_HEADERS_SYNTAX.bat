@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add whatsapp-backend/server.js package.json
git commit -m "fix: correct CORS headers syntax - use comma-separated string instead of multiple parameters"
git push origin main
