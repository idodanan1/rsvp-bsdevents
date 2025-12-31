@echo off
chcp 65001 >nul
echo ========================================
echo תיקון render.yaml - הפרדה בין Frontend ו-Backend
echo ========================================
echo.

echo מוסיף render.yaml...
git add render.yaml

echo.
echo יוצר commit...
git commit -m "fix: הפרדת render.yaml ל-rsvp-frontend ו-whatsapp-backend - whatsapp-backend לא צריך build"

echo.
echo מעלה ל-GitHub...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: render.yaml עודכן!
    echo.
    echo עכשיו:
    echo 1. פתח https://dashboard.render.com
    echo 2. בחר whatsapp-backend
    echo 3. בדוק שההגדרות נכונות:
    echo    - Build Command: npm install
    echo    - Start Command: npm start
    echo    - Root Directory: whatsapp-backend
    echo 4. אם לא, עדכן ידנית ב-Settings
    echo.
) else (
    echo.
    echo ERROR: שגיאה בהעלאה!
    echo.
)

pause
