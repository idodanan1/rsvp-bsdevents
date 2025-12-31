@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add src/components/Dashboard.tsx src/components/Layout.tsx package.json
git commit -m "feat: improve dashboard and layout design - modern UI with gradients and better spacing"
git push origin main
