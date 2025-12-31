@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo דחיפת commit ל-GitHub
echo ========================================
echo.

echo בודק commits אחרונים...
git log --oneline -3

echo.
echo דוחף ל-GitHub...
git push origin main 2>&1
set PUSH_EXIT_CODE=%ERRORLEVEL%

REM Check if push was successful (exit code 0) or if it's just a warning
git push origin main >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ השינויים הועלו ל-GitHub!
    echo ========================================
    echo.
    echo עכשיו:
    echo 1. לך ל-Render Dashboard: https://dashboard.render.com
    echo 2. חפש את rsvp-frontend
    echo 3. לחץ "Manual Deploy"
    echo 4. בחר "Deploy latest commit"
    echo 5. המתן 5-10 דקות לבנייה
    echo 6. נקה cache בדפדפן (Ctrl+Shift+Delete)
    echo 7. רענן את הדף (Ctrl+Shift+R)
    echo 8. בדוק את הגרסה - אמור להיות 1.0.211
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ שגיאה בדחיפה!
    echo ========================================
    echo.
    echo נסה:
    echo 1. git push origin main
    echo 2. או בדוק את החיבור ל-GitHub
    echo.
)

pause
