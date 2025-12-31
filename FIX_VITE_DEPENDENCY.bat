@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo תיקון vite dependency
echo ========================================
echo.

echo מוסיף קבצים...
git add package.json

echo.
echo יוצר commit...
git commit -m "fix: העברת vite ו-@vitejs/plugin-react ל-dependencies

- העברת vite מ-devDependencies ל-dependencies
- העברת @vitejs/plugin-react מ-devDependencies ל-dependencies
- זה נדרש כי Render לא מתקין devDependencies ב-production
- עדכון גרסה ל-1.0.213"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: אין שינויים חדשים או שגיאה ב-commit
    echo.
) else (
    echo.
    echo דוחף ל-GitHub...
    git push origin main
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo ✅ השינויים הועלו ל-GitHub!
        echo ========================================
        echo.
        echo עכשיו:
        echo 1. Render יבנה מחדש אוטומטית (אם Auto-Deploy מופעל)
        echo 2. או לך ל-Render Dashboard ולחץ "Manual Deploy"
        echo 3. המתן 5-10 דקות לבנייה
        echo 4. הפעם זה אמור לעבוד!
        echo.
    ) else (
        echo.
        echo ERROR: שגיאה בדחיפה ל-GitHub!
        echo.
    )
)

pause
