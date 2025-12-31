@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo תיקון Start Command
echo ========================================
echo.

echo מוסיף קבצים...
git add package.json

echo.
echo יוצר commit...
git commit -m "fix: תיקון Start Command ל-vite preview עם --host

- הוספת --host 0.0.0.0 כדי ש-Render יוכל לגשת לשירות
- הוספת --port \$PORT כדי להשתמש בפורט ש-Render נותן
- עדכון גרסה ל-1.0.214"

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
        echo 4. הפעם השירות יהיה נגיש!
        echo.
    ) else (
        echo.
        echo ERROR: שגיאה בדחיפה ל-GitHub!
        echo.
    )
)

pause
