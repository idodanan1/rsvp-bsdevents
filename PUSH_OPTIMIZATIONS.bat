@echo off
chcp 65001 >nul
echo ========================================
echo דחיפת אופטימיזציות ל-GitHub
echo ========================================
echo.

echo בודק סטטוס...
git status --short

echo.
echo מוסיף קבצים...
git add src/App.tsx
git add src/store/eventStore.ts
git add src/components/EventManagement.tsx
git add src/store/campaignStore.ts
git add src/components/GuestResponse.tsx
git add vite.config.ts
git add package.json

echo.
echo יוצר commit...
git commit -m "feat: אופטימיזציות - Code Splitting, תיקון ייבואים, ועדכון תלויות - גרסה 1.0.201"

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
        echo 1. Render יזהה את השינויים אוטומטית
        echo 2. rsvp-frontend יתחיל build חדש
        echo 3. whatsapp-backend לא צריך build (רק npm install)
        echo.
        echo בדוק את ה-Deploys ב-Render Dashboard
        echo.
    ) else (
        echo.
        echo ERROR: שגיאה בדחיפה ל-GitHub!
        echo.
    )
)

pause
