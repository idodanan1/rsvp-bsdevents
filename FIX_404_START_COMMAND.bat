@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add package.json vite.config.ts
git commit -m "fix: improve vite preview start command and base path configuration to fix 404 errors"
git push origin main
