@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo דחיפה מיידית ל-GitHub
echo ========================================
echo.

echo מעלה ל-GitHub...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ השינויים הועלו ל-GitHub!
    echo ========================================
    echo.
    echo Repository: idodanan1/-rsvp-management-system
    echo Commit: 9da99ce
    echo.
    echo עכשיו:
    echo 1. לך ל-Render Dashboard
    echo 2. חפש: rsvp-frontend
    echo 3. בדוק את ה-Deploys
    echo 4. אם לא רואה build חדש, לחץ "Manual Deploy"
    echo.
) else (
    echo.
    echo ERROR: שגיאה בדחיפה ל-GitHub!
    echo.
    echo נסה ידנית:
    echo git push origin main
    echo.
)

pause
