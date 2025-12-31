@echo off
cd /d "%~dp0"
git add package.json
git commit -m "fix: vite preview with host flag - v1.0.214"
git push origin main
