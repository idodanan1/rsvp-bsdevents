@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add src/index.css src/App.tsx src/components/Layout.tsx src/components/Dashboard.tsx package.json
git commit -m "fix: emergency CSS reset - force full width layout, remove all constraints causing squashed UI"
git push origin main
