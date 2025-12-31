@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo דחיפה סופית ל-GitHub
echo ========================================
echo.

REM בדיקה שהתיקייה נכונה
if not exist package.json (
    echo ERROR: package.json לא נמצא!
    pause
    exit /b 1
)

echo מוסיף כל השינויים...
git add package.json render.yaml vite.config.ts
git add src/components/ClientDashboard.tsx
git add src/components/EventManagement.tsx
git add src/components/GuestResponse.tsx

echo.
echo יוצר commit...
git commit -m "fix: תיקון קונפליקט ESLint ותיקון שגיאות TypeScript - גרסה 1.0.205

- Downgrade eslint מ-^9.17.0 ל-^8.57.0 (תואם ל-eslint-config-next@14)
- הוספת --legacy-peer-deps ל-build commands ב-render.yaml
- תיקון ERESOLVE error ב-Render deployment
- הוספת imports חסרים של lucide-react icons ב-ClientDashboard
- תיקון type annotations ב-EventManagement ו-GuestResponse
- שיפור code splitting - פיצול export libraries ל-chunks נפרדים
- Build הצליח - כל chunks מפוצלים נכון"

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
        echo 2. rsvp-frontend יתחיל build חדש עם --legacy-peer-deps
        echo 3. whatsapp-backend יתחיל build חדש עם --legacy-peer-deps
        echo.
        echo בדוק את ה-Deploys ב-Render Dashboard:
        echo - https://dashboard.render.com
        echo - חפש: rsvp-frontend
        echo.
        echo המתן 5-10 דקות עד שהבנייה מסתיימת
        echo.
        echo אחרי שהבנייה מסתיימת:
        echo 1. פתח את האתר
        echo 2. לחץ Ctrl+Shift+R (Hard Refresh)
        echo 3. בדוק את הקונסול (F12)
        echo 4. אמור לראות lazy loading ו-chunks נפרדים
        echo.
    ) else (
        echo.
        echo ERROR: שגיאה בדחיפה ל-GitHub!
        echo.
    )
)

pause
