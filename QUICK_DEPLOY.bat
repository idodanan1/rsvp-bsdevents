@echo off
chcp 65001 >nul
title Quick Deploy to GitHub
color 0A

cd /d "%~dp0"

echo.
echo ========================================
echo   Quick Deploy to GitHub
echo ========================================
echo.

REM Check Git
where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed!
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

echo [INFO] Preparing Git repository...
call git add . >nul 2>&1
call git commit -m "Deploy to production" >nul 2>&1
call git branch -M main >nul 2>&1

echo [INFO] Git repository ready!
echo.
echo ========================================
echo   Next Steps:
echo ========================================
echo.
echo 1. Create repository on GitHub:
echo    https://github.com/new
echo    Name: rsvp-management-system
echo.
echo 2. Enter your GitHub username:
set /p USERNAME="GitHub Username: "

echo.
echo 3. Pushing to GitHub...
call git remote remove origin >nul 2>&1
call git remote add origin https://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@github.com/%USERNAME%/rsvp-management-system.git

call git push -u origin main

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to push to GitHub!
    echo.
    echo Make sure:
    echo 1. Repository exists on GitHub
    echo 2. Username is correct
    echo 3. Token has permissions
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ Code pushed to GitHub!
echo ========================================
echo.
echo Next: Deploy on Render.com
echo 1. Go to https://render.com/
echo 2. Sign up with GitHub
echo 3. Click New → Blueprint
echo 4. Select repository: %USERNAME%/rsvp-management-system
echo.
pause

