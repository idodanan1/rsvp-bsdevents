@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add vite.config.ts render.yaml package.json
git commit -m "fix: ensure Vite build outputs correct file paths and Render serves dist folder correctly"
git push origin main
