@echo off
cd /d "%~dp0"
git add index.html src/index.css src/App.tsx src/components/Layout.tsx src/components/ClientDashboard.tsx src/components/EventManagement.tsx package.json
git commit -m "fix: full-width responsive layout - remove max-width constraints - v1.0.216"
git push origin main
pause
