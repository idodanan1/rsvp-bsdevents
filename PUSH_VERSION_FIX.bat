@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo דחיפת תיקון גרסה
echo ========================================
echo.

echo מוסיף קבצים...
git add package.json vite.config.ts src/components/Footer.tsx src/components/Layout.tsx

echo.
echo יוצר commit...
git commit -m "fix: תיקון תצוגת גרסה - גרסה 1.0.210

- תיקון Footer.tsx - החלפת next/link ב-react-router-dom
- עדכון תצוגת גרסה ב-Layout ו-Footer
- הוספת גרסה ב-Footer
- עדכון package.json ל-1.0.210"

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
        echo 1. Render יבנה מחדש
        echo 2. אחרי שהבנייה מסתיימת, נקה cache (Ctrl+Shift+Delete)
        echo 3. רענן את הדף (Ctrl+Shift+R)
        echo 4. בדוק את הגרסה בתחתית הדף - אמור להיות 1.0.210
        echo.
    ) else (
        echo.
        echo ERROR: שגיאה בדחיפה ל-GitHub!
        echo.
    )
)

pause
