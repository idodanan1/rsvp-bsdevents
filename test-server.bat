@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Server Diagnostic Test
echo ========================================
echo.

echo [1/6] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Node.js not found!
    pause
    exit /b 1
) else (
    echo [OK] Node.js found:
    node --version
)

echo.
echo [2/6] Checking npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo [FAIL] npm not found!
    pause
    exit /b 1
) else (
    echo [OK] npm found:
    npm --version
)

echo.
echo [3/6] Checking project files...
if exist "index.html" (echo [OK] index.html) else (echo [FAIL] index.html missing!)
if exist "src\main.tsx" (echo [OK] src\main.tsx) else (echo [FAIL] src\main.tsx missing!)
if exist "package.json" (echo [OK] package.json) else (echo [FAIL] package.json missing!)
if exist "vite.config.ts" (echo [OK] vite.config.ts) else (echo [FAIL] vite.config.ts missing!)

echo.
echo [4/6] Checking dependencies...
if exist "node_modules" (
    echo [OK] node_modules exists
) else (
    echo [WARN] node_modules missing - installing...
    call npm install
    if errorlevel 1 (
        echo [FAIL] npm install failed!
        pause
        exit /b 1
    )
)

echo.
echo [5/6] Checking port 5173...
netstat -ano | findstr ":5173" >nul
if %errorlevel% == 0 (
    echo [WARN] Port 5173 is in use!
    echo [INFO] Finding process using port 5173:
    netstat -ano | findstr ":5173"
) else (
    echo [OK] Port 5173 is available
)

echo.
echo [6/6] Testing Vite installation...
npx vite --version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Vite not found! Installing...
    call npm install vite --save-dev
) else (
    echo [OK] Vite is installed:
    npx vite --version
)

echo.
echo ========================================
echo   Starting Server Test
echo ========================================
echo.
echo [INFO] Attempting to start server...
echo [INFO] If server starts, open http://localhost:5173/ in your browser
echo [INFO] Press Ctrl+C to stop
echo.

call npx vite --host localhost --port 5173 --force

pause
