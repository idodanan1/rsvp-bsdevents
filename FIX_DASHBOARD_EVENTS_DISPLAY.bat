@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add src/components/Dashboard.tsx package.json
git commit -m "fix: show events immediately even during loading - display events from localStorage while fetching from server"
git push origin main
