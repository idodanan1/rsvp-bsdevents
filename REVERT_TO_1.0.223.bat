@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add package.json
git commit -m "revert: return to version 1.0.223"
git push origin main
