@echo off
chcp 65001 >nul
echo ========================================
echo 🧪 בדיקת שליחת WhatsApp
echo ========================================
echo.
echo 📱 מספר טלפון: 0547377881
echo 💬 הודעה: בדיקת מערכת
echo.

cd /d "%~dp0whatsapp-backend"

echo 🔍 בודק אם השרת רץ...
timeout /t 2 /nobreak >nul

echo.
echo 🚀 מריץ את בדיקת השליחה...
echo.

node test-send.js

echo.
echo ========================================
echo ✅ הבדיקה הושלמה
echo ========================================
pause

