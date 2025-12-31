@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add src/components/Dashboard.tsx package.json
git commit -m "fix: missing closing div tag in Dashboard header"
git push origin main
