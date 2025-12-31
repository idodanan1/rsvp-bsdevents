@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo בדיקה ודחיפה ל-GitHub
echo ========================================
echo.

REM בדיקה שהתיקייה נכונה
if not exist package.json (
    echo ERROR: package.json לא נמצא!
    pause
    exit /b 1
)

echo שלב 1: בדיקת TypeScript...
call npm run type-check

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: יש שגיאות TypeScript - בדוק אותן
    echo.
) else (
    echo ✅ אין שגיאות TypeScript!
    echo.
)

echo שלב 2: Build...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: שגיאה ב-Build!
    pause
    exit /b 1
)

echo.
echo ✅ Build הצליח!
echo.

echo שלב 3: דחיפה ל-GitHub...
echo.
git add package.json render.yaml vite.config.ts src/components/ClientDashboard.tsx src/components/EventManagement.tsx src/components/GuestResponse.tsx
git commit -m "fix: תיקון קונפליקט ESLint ותיקון שגיאות TypeScript - גרסה 1.0.204

- Downgrade eslint מ-^9.17.0 ל-^8.57.0 (תואם ל-eslint-config-next@14)
- הוספת --legacy-peer-deps ל-build commands ב-render.yaml
- תיקון ERESOLVE error ב-Render deployment
- הוספת imports חסרים של lucide-react icons ב-ClientDashboard
- תיקון type annotations ב-EventManagement ו-GuestResponse
- שיפור code splitting - פיצול export libraries ל-chunks נפרדים"

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
