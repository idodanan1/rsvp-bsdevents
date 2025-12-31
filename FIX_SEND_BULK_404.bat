@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add src/services/messageService.ts src/components/EventManagement.tsx package.json
git commit -m "fix: handle 404 for send-bulk endpoint and improve filteredGuests validation"
git push origin main
