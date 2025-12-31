@echo off
echo Checking Git status...
git status
echo.
echo Adding all files...
git add .
echo.
echo Creating commit...
git commit -m "fix: update version display and ensure load from DB button is visible"
echo.
echo Pushing to GitHub...
git push origin main
echo.
echo Done! Check Render dashboard for new deployment.
pause
