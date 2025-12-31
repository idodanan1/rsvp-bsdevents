@echo off
chcp 65001 >nul
echo ========================================
echo תיקון והעלאה לשרת
echo ========================================
echo.

echo שלב 1: בודק שהקוד המקומי תקין...
echo.
echo בודק package.json...
findstr /C:"<<<<<<<" package.json >nul
if %ERRORLEVEL% EQU 0 (
    echo ❌ נמצא merge conflict ב-package.json!
    echo פתח את package.json ותקן את הקונפליקט ידנית
    pause
    exit /b 1
) else (
    echo ✅ package.json תקין
)
echo.

echo שלב 2: בודק סטטוס Git...
git status
echo.

echo שלב 3: מוסיף את כל הקבצים...
git add .
echo.

echo שלב 4: יוצר commit...
git commit -m "fix: תיקון merge conflict ב-package.json + הוספת כפתור טען מהמאגר בדשבורד"
echo.

echo שלב 5: מעלה ל-GitHub...
git push
echo.

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ השינויים הועלו בהצלחה ל-GitHub!
    echo.
    echo 📋 מה לעשות עכשיו:
    echo 1. פתח את https://dashboard.render.com
    echo 2. בחר את הפרויקט rsvp-frontend-wy47
    echo 3. בדוק את ה-Deploys tab
    echo 4. חכה שהבנייה תסתיים (2-5 דקות)
    echo 5. פתח את https://rsvp-frontend-wy47.onrender.com
    echo 6. לחץ Ctrl+Shift+R (Hard Refresh)
    echo.
) else (
    echo.
    echo ❌ שגיאה בהעלאה!
    echo.
    echo נסה:
    echo git push origin main
    echo או:
    echo git push origin master
    echo.
)

pause
