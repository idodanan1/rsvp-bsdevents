@echo off
chcp 65001 >nul
echo ========================================
echo תיקון Build - Vite במקום Next.js
echo ========================================
echo.

echo בודק package.json...
findstr /C:"vite build" package.json >nul
if %ERRORLEVEL% EQU 0 (
    echo OK: package.json מכיל vite build
) else (
    echo ERROR: package.json לא מכיל vite build!
    pause
    exit /b 1
)

echo.
echo מוסיף קבצים...
git add package.json

echo.
echo יוצר commit...
git commit -m "fix: שינוי מ-Next.js ל-Vite - הפרויקט הוא React Router + Vite"

echo.
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
    echo 4. ה-build אמור לעבוד עכשיו עם vite build
    echo.
) else (
    echo.
    echo ERROR: שגיאה בהעלאה!
    echo.
)

pause
