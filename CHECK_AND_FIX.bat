@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo בדיקת סטטוס Git
echo ========================================
echo.

echo סטטוס Git:
git status

echo.
echo ========================================
echo Commits אחרונים:
echo ========================================
git log --oneline -5

echo.
echo ========================================
echo מה לעשות:
echo ========================================
echo.
echo אם יש שינויים שלא נדחפו:
echo 1. הרץ: PUSH_VERSION_FIX.bat
echo 2. המתן לבנייה ב-Render
echo 3. נקה cache בדפדפן
echo.
echo אם זה לא עובד:
echo - ראה: QUICK_FIX_BEFORE_DELETE.md
echo - או: RESET_RENDER_SERVICE.md
echo.

pause
