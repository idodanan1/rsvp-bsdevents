@echo off
chcp 65001 >nul
echo ========================================
echo תיקון package.json והעלאה
echo ========================================
echo.

echo בודק package.json...
findstr /C:"<<<<<<<" package.json >nul
if %ERRORLEVEL% EQU 0 (
    echo ERROR: נמצא merge conflict ב-package.json!
    pause
    exit /b 1
)

echo package.json תקין
echo.

echo מוסיף קבצים...
git add package.json
git add src/components/Dashboard.tsx

echo יוצר commit...
git commit -m "fix: תיקון merge conflict ב-package.json - גרסה 1.0.191"

echo מעלה ל-GitHub...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: הקוד הועלה בהצלחה!
    echo.
    echo עכשיו:
    echo 1. פתח https://dashboard.render.com
    echo 2. בחר rsvp-frontend
    echo 3. בדוק את ה-Deploys
    echo.
) else (
    echo.
    echo ERROR: שגיאה בהעלאה!
    echo.
)

pause
