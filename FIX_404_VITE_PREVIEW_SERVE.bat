@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add render.yaml package.json vite.config.ts
git commit -m "fix: remove staticPublishPath from render.yaml - vite preview serves dist automatically"
git push origin main
