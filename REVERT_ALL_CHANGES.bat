@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add src/components/Dashboard.tsx src/components/Layout.tsx package.json
git commit -m "revert: return to version 1.0.223 - undo all layout and visibility changes"
git push origin main
