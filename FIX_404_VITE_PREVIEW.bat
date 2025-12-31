@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add vite.config.ts package.json
git commit -m "fix: add base path and improve vite preview configuration to serve built files correctly"
git push origin main
