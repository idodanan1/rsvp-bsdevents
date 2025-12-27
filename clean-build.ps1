# Clean build script - removes .next and node_modules cache
# Run this before building to ensure a clean state

Write-Host "🧹 Cleaning build cache..." -ForegroundColor Cyan

# Remove .next directory
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✅ Removed .next directory" -ForegroundColor Green
} else {
    Write-Host "ℹ️ .next directory not found" -ForegroundColor Yellow
}

# Remove node_modules/.cache if it exists
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "✅ Removed node_modules/.cache" -ForegroundColor Green
} else {
    Write-Host "ℹ️ node_modules/.cache not found" -ForegroundColor Yellow
}

# Remove TypeScript build info
if (Test-Path "tsconfig.tsbuildinfo") {
    Remove-Item -Force "tsconfig.tsbuildinfo"
    Write-Host "✅ Removed tsconfig.tsbuildinfo" -ForegroundColor Green
}

Write-Host "✨ Clean build complete! You can now run 'npm run build'" -ForegroundColor Green

