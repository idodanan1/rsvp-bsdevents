@echo off
REM Push changes to idodanan1 / -rsvp-management-system main branch
echo Pushing to upstream/main (idodanan1 / -rsvp-management-system)...

git checkout main
if %errorlevel% neq 0 (
    echo Error: Failed to checkout main branch
    pause
    exit /b 1
)

git status
echo.
echo Checking for uncommitted changes...
git diff --quiet
if %errorlevel% neq 0 (
    echo Warning: You have uncommitted changes!
    echo Do you want to commit them? (Y/N)
    set /p commit_choice=
    if /i "%commit_choice%"=="Y" (
        echo Enter commit message:
        set /p commit_msg=
        git add .
        git commit -m "%commit_msg%"
    )
)

echo.
echo Pushing to upstream/main...
git push upstream main
if %errorlevel% neq 0 (
    echo Error: Failed to push to upstream/main
    pause
    exit /b 1
)

echo.
echo Successfully pushed to upstream/main!
echo Repository: idodanan1 / -rsvp-management-system
echo Branch: main
pause
