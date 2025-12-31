@echo off
chcp 65001 >nul
echo ========================================
echo דחיפת תיקון ESLint ל-GitHub
echo ========================================
echo.

echo מוסיף קבצים...
git add package.json render.yaml

echo.
echo יוצר commit...
git commit -m "fix: תיקון קונפליקט ESLint - downgrade ל-8.57.0 והוספת --legacy-peer-deps

- Downgrade eslint מ-^9.17.0 ל-^8.57.0 (תואם ל-eslint-config-next@14)
- הוספת --legacy-peer-deps ל-build commands ב-render.yaml
- תיקון ERESOLVE error ב-Render deployment"

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
        echo ✅ התיקון הועלה ל-GitHub!
        echo ========================================
        echo.
        echo עכשיו:
        echo 1. Render יזהה את השינויים אוטומטית
        echo 2. rsvp-frontend יתחיל build חדש עם --legacy-peer-deps
        echo 3. whatsapp-backend יתחיל build חדש עם --legacy-peer-deps
        echo.
        echo בדוק את ה-Deploys ב-Render Dashboard
        echo המתן 5-10 דקות עד שהבנייה מסתיימת
        echo.
    ) else (
        echo.
        echo ERROR: שגיאה בדחיפה ל-GitHub!
        echo.
    )
)

pause
