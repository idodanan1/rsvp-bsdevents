@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add whatsapp-backend/server.js
git commit -m "fix: add rsvp-frontend-new.onrender.com to CORS allowed origins"
git push origin main
