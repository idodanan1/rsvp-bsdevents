@echo off
cd /d "%~dp0"
git add src/services/webhookService.ts src/components/EventManagement.tsx package.json
git commit -m "fix: handle 404 for sync-updates endpoint and fix React #310 error in useMemo - v1.0.217"
git push origin main
pause
