@echo off
cd /d "%~dp0"
git add package.json
git commit -m "fix: vite preview with host flag"
git push origin main
pause
