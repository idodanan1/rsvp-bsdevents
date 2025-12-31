@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add src/components/Dashboard.tsx src/components/Layout.tsx src/components/EventManagement.tsx src/components/ClientDashboard.tsx src/components/ClientManagement.tsx src/components/Footer.tsx src/components/AdminDashboard.tsx src/components/UserManagement.tsx package.json
git commit -m "fix: comprehensive layout overhaul - remove max-width constraints, fix RTL properties, ensure full-width responsive design"
git push origin main
