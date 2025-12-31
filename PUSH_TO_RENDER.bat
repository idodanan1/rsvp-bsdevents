@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo דחיפה ל-GitHub ו-Render
echo ========================================
echo.

REM בדיקה שהתיקייה נכונה
if not exist package.json (
    echo ERROR: package.json לא נמצא!
    pause
    exit /b 1
)

echo בודק סטטוס Git...
git status

echo.
echo מוסיף כל השינויים...
git add .

echo.
echo יוצר commit...
git commit -m "feat: עדכון גרסה 1.0.206 - תיקון UI ובדיקת Render

- תיקון imports חסרים ב-ClientDashboard
- תיקון type annotations ב-EventManagement ו-GuestResponse
- שיפור code splitting
- בדיקת UI בשרת מקומי - הכל עובד"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: אין שינויים חדשים או שגיאה ב-commit
    echo.
) else (
    echo.
    echo מעלה ל-GitHub...
    git push origin main
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo ✅ השינויים הועלו ל-GitHub!
        echo ========================================
        echo.
        echo עכשיו:
        echo 1. לך ל-Render Dashboard
        echo 2. חפש: rsvp-frontend
        echo 3. בדוק את ה-Deploys
        echo 4. אם לא רואה build חדש, לחץ "Manual Deploy"
        echo.
        echo המתן 5-10 דקות עד שהבנייה מסתיימת
        echo.
    ) else (
        echo.
        echo ERROR: שגיאה בדחיפה ל-GitHub!
        echo.
    )
)

pause
