@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo דוחף ל-GitHub...
git push origin main

pause
