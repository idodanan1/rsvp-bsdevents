@echo off
chcp 65001 >nul
echo ========================================
echo העלאה סופית - כפתור טען מהמאגר + גרסה
echo ========================================
echo.

echo בודק קבצים...
echo - Dashboard.tsx: כפתור טען מהמאגר
findstr /C:"טען מהמאגר" src\components\Dashboard.tsx >nul
if %ERRORLEVEL% EQU 0 (
    echo   OK: כפתור קיים ב-Dashboard.tsx
) else (
    echo   ERROR: כפתור לא נמצא!
    pause
    exit /b 1
)

echo - Layout.tsx: גרסה
findstr /C:"גרסה" src\components\Layout.tsx >nul
if %ERRORLEVEL% EQU 0 (
    echo   OK: גרסה קיימת ב-Layout.tsx
) else (
    echo   ERROR: גרסה לא נמצאה!
    pause
    exit /b 1
)

echo.
echo מוסיף כל הקבצים...
git add src/components/Dashboard.tsx
git add src/components/Layout.tsx
git add vite.config.ts
git add package.json

echo.
echo יוצר commit...
git commit -m "feat: הוספת כפתור טען מהמאגר + עדכון גרסה ל-1.0.199 + תיקון vite.config"

echo.
echo מעלה ל-GitHub...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS: הקוד הועלה בהצלחה!
    echo ========================================
    echo.
    echo מה קורה עכשיו:
    echo 1. Render יבנה מחדש אוטומטית (2-5 דקות)
    echo 2. אחרי הבנייה:
    echo    - פתח את האתר
    echo    - לחץ Ctrl+Shift+R (Hard Refresh)
    echo    - הכפתור "טען מהמאגר" אמור להופיע
    echo    - הגרסה אמורה להיות 1.0.199
    echo.
    echo אם זה לא עובד:
    echo - בדוק את ה-Logs ב-Render Dashboard
    echo - ודא שהבנייה הצליחה
    echo - נסה Hard Refresh (Ctrl+Shift+R)
    echo.
) else (
    echo.
    echo ERROR: שגיאה בהעלאה!
    echo.
)

pause
