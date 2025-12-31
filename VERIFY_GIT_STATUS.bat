@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo בדיקת סטטוס Git
echo ========================================
echo.

echo 1. בודק את ה-Remote...
git remote -v

echo.
echo 2. בודק את הסטטוס...
git status

echo.
echo 3. בודק את ה-Commits האחרונים...
git log --oneline -5

echo.
echo 4. בודק אם יש שינויים שלא נדחפו...
git log origin/main..HEAD --oneline

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo יש שינויים שלא נדחפו ל-GitHub!
    echo ========================================
    echo.
    echo כדי לדחוף, הרץ:
    echo git push origin main
    echo.
) else (
    echo.
    echo ========================================
    echo כל השינויים נדחפו ל-GitHub
    echo ========================================
    echo.
)

pause
