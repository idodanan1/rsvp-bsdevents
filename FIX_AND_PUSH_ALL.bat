@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo תיקון ודחיפה של כל השינויים
echo ========================================
echo.

echo שלב 1: בודק סטטוס...
git status

echo.
echo שלב 2: מוסיף את כל הקבצים...
git add package.json
git add vite.config.ts
git add src/components/Footer.tsx
git add src/components/Layout.tsx
git add render.yaml
git add .

echo.
echo שלב 3: יוצר commit...
git commit -m "fix: תיקון תצוגת גרסה והחלפת next/link ב-react-router-dom - גרסה 1.0.211

- תיקון Footer.tsx - החלפת next/link ב-react-router-dom
- עדכון תצוגת גרסה ב-Layout ו-Footer
- הוספת גרסה ב-Footer
- עדכון package.json ל-1.0.211
- תיקון vite.config.ts"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: אין שינויים חדשים או שגיאה ב-commit
    echo.
) else (
    echo.
    echo שלב 4: מעלה ל-GitHub...
    git push origin main
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo ✅ השינויים הועלו ל-GitHub!
        echo ========================================
        echo.
        echo עכשיו:
        echo 1. לך ל-Render Dashboard
        echo 2. לחץ "Manual Deploy" על rsvp-frontend
        echo 3. בחר "Deploy latest commit"
        echo 4. המתן 5-10 דקות לבנייה
        echo 5. נקה cache בדפדפן (Ctrl+Shift+Delete)
        echo 6. רענן את הדף (Ctrl+Shift+R)
        echo 7. בדוק את הגרסה - אמור להיות 1.0.211
        echo.
        echo אם זה לא עובד אחרי 10 דקות:
        echo - ראה: QUICK_FIX_BEFORE_DELETE.md
        echo - או: RESET_RENDER_SERVICE.md
        echo.
    ) else (
        echo.
        echo ERROR: שגיאה בדחיפה ל-GitHub!
        echo.
    )
)

pause
