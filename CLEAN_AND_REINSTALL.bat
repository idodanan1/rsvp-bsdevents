@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo ניקוי והתקנה מחדש
echo ========================================
echo.
echo תיקייה נוכחית: %CD%
echo.

echo שלב 1: מחיקת node_modules...
if exist node_modules (
    echo מוחק node_modules...
    rmdir /s /q node_modules
    echo ✅ node_modules נמחק
) else (
    echo ℹ️ node_modules לא קיים
)

echo.
echo שלב 2: מחיקת package-lock.json...
if exist package-lock.json (
    echo מוחק package-lock.json...
    del /q package-lock.json
    echo ✅ package-lock.json נמחק
) else (
    echo ℹ️ package-lock.json לא קיים
)

echo.
echo שלב 3: התקנת תלויות עם --legacy-peer-deps...
call npm install --legacy-peer-deps

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: שגיאה בהתקנת תלויות!
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ ניקוי והתקנה הושלמו!
echo ========================================
echo.
echo עכשיו:
echo 1. בדוק שהכל עובד: npm run build
echo 2. דחוף את השינויים ל-GitHub
echo 3. Render יבנה עם --legacy-peer-deps
echo.
pause
