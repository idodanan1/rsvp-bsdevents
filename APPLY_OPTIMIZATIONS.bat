@echo off
chcp 65001 >nul
echo ========================================
echo יישום אופטימיזציות
echo ========================================
echo.

echo שלב 1: התקנת תלויות מעודכנות...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: שגיאה בהתקנת תלויות!
    pause
    exit /b 1
)

echo.
echo שלב 2: בדיקת שגיאות TypeScript...
call npm run type-check

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: יש שגיאות TypeScript - בדוק אותן
    echo.
) else (
    echo.
    echo ✅ אין שגיאות TypeScript!
    echo.
)

echo שלב 3: Build...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: שגיאה ב-Build!
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ אופטימיזציות הושלמו!
echo ========================================
echo.
echo מה נעשה:
echo - Code Splitting עם React.lazy
echo - תיקון ייבואים כפולים
echo - manualChunks ב-Vite
echo - עדכון תלויות
echo.
echo בדוק את dist/ - אמור לראות chunks נפרדים
echo.
pause
