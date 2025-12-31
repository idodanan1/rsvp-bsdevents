@echo off
chcp 65001 >nul
echo ========================================
echo התקנת תלויות - גרסה מתוקנת
echo ========================================
echo.

REM נווט לתיקיית הפרויקט
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo תיקייה נוכחית: %CD%
echo.

REM בדיקה שהתיקייה נכונה
if not exist package.json (
    echo ERROR: package.json לא נמצא!
    echo התיקייה הנוכחית: %CD%
    echo.
    echo אנא הרץ את הסקריפט מהתיקייה של הפרויקט
    pause
    exit /b 1
)

echo ✅ package.json נמצא - התיקייה נכונה
echo.

REM מחיקת node_modules אם קיים
if exist node_modules (
    echo מוחק node_modules...
    rmdir /s /q node_modules
    echo ✅ node_modules נמחק
    echo.
)

REM מחיקת package-lock.json אם קיים
if exist package-lock.json (
    echo מוחק package-lock.json...
    del /q package-lock.json
    echo ✅ package-lock.json נמחק
    echo.
)

REM התקנת תלויות
echo מתקין תלויות עם --legacy-peer-deps...
echo.
call npm install --legacy-peer-deps

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: שגיאה בהתקנת תלויות!
    echo.
    echo נסה:
    echo 1. פתח Command Prompt כמנהל (Run as Administrator)
    echo 2. נווט לתיקיית הפרויקט
    echo 3. הרץ: npm install --legacy-peer-deps
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ התקנה הושלמה בהצלחה!
echo ========================================
echo.
pause
