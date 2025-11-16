@echo off
chcp 65001 >nul
title שליחת הודעת WhatsApp מותאמת
color 0A

echo ========================================
echo   שליחת הודעת WhatsApp מותאמת
echo ========================================
echo.

cd /d "%~dp0whatsapp-backend"

if not exist "node_modules" (
    echo [INFO] מתקין תלויות...
    call npm install
    echo.
)

echo [INFO] שולח הודעה לטלפון 0547377881...
echo.

node send-custom-message.js

echo.
echo ========================================
echo   השליחה הושלמה
echo ========================================
pause

