@echo off
REM Clean build script - removes .next and node_modules cache
REM Run this before building to ensure a clean state

echo 🧹 Cleaning build cache...

REM Remove .next directory
if exist ".next" (
    rmdir /s /q ".next"
    echo ✅ Removed .next directory
) else (
    echo ℹ️ .next directory not found
)

REM Remove node_modules/.cache if it exists
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo ✅ Removed node_modules/.cache
) else (
    echo ℹ️ node_modules/.cache not found
)

REM Remove TypeScript build info
if exist "tsconfig.tsbuildinfo" (
    del /f "tsconfig.tsbuildinfo"
    echo ✅ Removed tsconfig.tsbuildinfo
)

echo ✨ Clean build complete! You can now run 'npm run build'

