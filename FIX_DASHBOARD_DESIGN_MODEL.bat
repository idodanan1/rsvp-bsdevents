@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add src/components/Dashboard.tsx package.json
git commit -m "fix: update Dashboard event cards design to match the model - simple and clean layout"
git push origin main
