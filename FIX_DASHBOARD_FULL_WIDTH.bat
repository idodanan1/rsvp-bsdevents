@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add src/components/Dashboard.tsx src/components/Layout.tsx package.json
git commit -m "feat: stretch dashboard to full width for desktop resolution proportions"
git push origin main
