@echo off
chcp 65001 >nul
echo ========================================
echo דחיפת כל השינויים ל-GitHub
echo ========================================
echo.

echo בודק סטטוס...
git status

echo.
echo מוסיף כל השינויים...
git add .

echo.
echo יוצר commit...
git commit -m "feat: אופטימיזציות - Code Splitting, תיקון ייבואים, ועדכון תלויות - גרסה 1.0.201

- הוספת React.lazy ו-Suspense לכל הקומפוננטות הכבדות
- תיקון ייבואים כפולים ב-eventStore, EventManagement, campaignStore, GuestResponse
- הוספת manualChunks ב-vite.config.ts לפיצול ספריות כבדות
- עדכון כל התלויות לגרסאות האחרונות
- תיקון פגיעויות אבטחה"

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
        echo ✅ כל השינויים הועלו ל-GitHub!
        echo ========================================
        echo.
        echo עכשיו:
        echo 1. Render יזהה את השינויים אוטומטית
        echo 2. rsvp-frontend יתחיל build חדש (עם אופטימיזציות)
        echo 3. whatsapp-backend לא צריך build (רק npm install)
        echo.
        echo בדוק את ה-Deploys ב-Render Dashboard:
        echo - rsvp-frontend: צריך build חדש
        echo - whatsapp-backend: לא צריך build (רק npm install)
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
