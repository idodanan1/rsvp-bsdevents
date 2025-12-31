@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo תיקון בעיית Cache
echo ========================================
echo.

echo מוסיף קבצים...
git add vite.config.ts index.html

echo.
echo יוצר commit...
git commit -m "fix: תיקון cache - הוספת cache busting ומניעת cache

- תיקון vite.config.ts - הוספת hash לקבצים
- הוספת meta tags למניעת cache ב-index.html
- זה יפתור את בעיית העדכון ב-Render"

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
        echo 1. Render יבנה מחדש עם cache busting
        echo 2. נקה את ה-cache בדפדפן (Ctrl+Shift+Delete)
        echo 3. רענן את הדף (Ctrl+Shift+R)
        echo.
        echo אחרי שהבנייה מסתיימת:
        echo - כל build יוצר קבצים עם hash חדש
        echo - הדפדפן יטען את הקבצים החדשים
        echo - האפליקציה תתעדכן אוטומטית
        echo.
    ) else (
        echo.
        echo ERROR: שגיאה בדחיפה ל-GitHub!
        echo.
    )
)

pause
