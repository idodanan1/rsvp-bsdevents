@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add render.yaml package.json vite.config.ts
git commit -m "fix: configure Render to serve dist folder and ensure vite preview serves built files correctly"
git push origin main
