@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add src/components/Dashboard.tsx src/components/Layout.tsx package.json
git commit -m "feat: expand dashboard layout proportionally to screen - full width responsive design"
git push origin main
