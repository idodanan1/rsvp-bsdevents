@echo off
echo ========================================
echo העלאת כל הפרויקט ל-Git
echo ========================================
echo.

echo בודק סטטוס Git...
git status
echo.

echo מוסיף את כל הקבצים...
git add .
echo.

echo יוצר commit...
git commit -F COMMIT_MESSAGE.txt
echo.

echo האם להעלות ל-GitHub? (Y/N)
set /p push_choice=

if /i "%push_choice%"=="Y" (
    echo מעלה ל-GitHub...
    git push
    echo.
    echo ✅ הפרויקט הועלה בהצלחה!
) else (
    echo ℹ️ Commit נוצר, אבל לא הועלה ל-GitHub
    echo להעלות מאוחר יותר, הרץ: git push
)

pause
