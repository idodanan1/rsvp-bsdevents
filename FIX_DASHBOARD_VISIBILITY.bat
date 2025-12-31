@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add src/components/Dashboard.tsx src/components/Layout.tsx package.json
git commit -m "fix: ensure dashboard content is visible - fix loading state and main content background"
git push origin main
