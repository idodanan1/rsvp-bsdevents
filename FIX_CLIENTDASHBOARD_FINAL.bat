@echo off
chcp 65001 >nul
echo ========================================
echo תיקון שגיאת syntax סופי ב-ClientDashboard.tsx
echo ========================================
echo.

echo מוסיף קבצים...
git add src/components/ClientDashboard.tsx

echo.
echo יוצר commit...
git commit -m "fix: תיקון שגיאת syntax - העברת loadFromAPI לתוך if block ב-ClientDashboard.tsx"

echo.
echo מעלה ל-GitHub...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: הקוד הועלה בהצלחה!
    echo.
    echo עכשיו:
    echo 1. Render יבנה מחדש אוטומטית
    echo 2. ה-build אמור לעבור בהצלחה
    echo 3. בדוק את ה-Deploys ב-Render Dashboard
    echo.
) else (
    echo.
    echo ERROR: שגיאה בהעלאה!
    echo.
)

pause
