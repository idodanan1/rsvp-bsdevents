@echo off
cd /d "%~dp0"
git add vite.config.ts package.json
git commit -m "fix: add Render hosts to vite preview allowedHosts - v1.0.215"
git push origin main
pause
