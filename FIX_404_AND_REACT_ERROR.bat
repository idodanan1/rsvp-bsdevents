@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add src/services/webhookService.ts src/components/EventManagement.tsx package.json
git commit -m "fix: handle 404 for sync-updates endpoint and fix React Error #310 in EventManagement"
git push origin main
