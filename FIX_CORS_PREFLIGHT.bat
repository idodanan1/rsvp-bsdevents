@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add whatsapp-backend/server.js package.json
git commit -m "fix: improve CORS preflight handling for rsvp-frontend-new.onrender.com - fix OPTIONS requests"
git push origin main
