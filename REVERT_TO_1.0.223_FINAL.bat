@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add src/components/Dashboard.tsx src/components/Layout.tsx src/components/EventManagement.tsx src/components/ClientDashboard.tsx src/components/ClientManagement.tsx src/components/Footer.tsx src/components/AdminDashboard.tsx src/components/UserManagement.tsx package.json
git commit -m "revert: return to version 1.0.223 - undo all layout, RTL, and visibility changes"
git push origin main
