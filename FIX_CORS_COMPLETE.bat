@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add whatsapp-backend/server.js
git commit -m "fix: complete CORS fix for rsvp-frontend-new.onrender.com - improve preflight handling and add logging"
git push origin main
