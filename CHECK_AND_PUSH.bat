@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo בדיקה ודחיפה ל-GitHub
echo ========================================
echo.

echo 1. בודק את ה-Remote...
git remote -v

echo.
echo 2. בודק את הסטטוס...
git status

echo.
echo 3. בודק אם יש שינויים שלא נדחפו...
git fetch origin
git log origin/main..HEAD --oneline

echo.
echo 4. מוסיף כל השינויים...
git add .

echo.
echo 5. יוצר commit...
git commit -m "feat: עדכון גרסה 1.0.207 - תיקון UI ובדיקת Render

- תיקון imports חסרים ב-ClientDashboard
- תיקון type annotations ב-EventManagement ו-GuestResponse
- שיפור code splitting
- בדיקת UI בשרת מקומי - הכל עובד
- ודא שהשינויים נדחפים ל-GitHub הנכון"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: אין שינויים חדשים או שגיאה ב-commit
    echo.
) else (
    echo.
    echo 6. מעלה ל-GitHub...
    git push origin main
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo ✅ השינויים הועלו ל-GitHub!
        echo ========================================
        echo.
        echo Repository: idodanan1/-rsvp-management-system
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
