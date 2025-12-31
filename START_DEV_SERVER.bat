@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo הפעלת שרת פיתוח מקומי
echo ========================================
echo.

REM בדיקה שהתיקייה נכונה
if not exist package.json (
    echo ERROR: package.json לא נמצא!
    echo אנא הרץ את הסקריפט מהתיקייה של הפרויקט
    pause
    exit /b 1
)

echo תיקייה נוכחית: %CD%
echo.

echo מתחיל שרת פיתוח...
echo.
echo השרת יעלה על: http://localhost:5173
echo.
echo לחץ Ctrl+C כדי לעצור את השרת
echo.
echo ========================================
echo.

call npm run dev
