# PowerShell Deploy Script for Render
# Usage: .\deploy.ps1

Write-Host "🚀 Starting deployment process..." -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "❌ Git not initialized. Initializing..." -ForegroundColor Yellow
    git init
    git add .
    git commit -m "Initial commit - ready for deployment"
}

# Check if remote exists
$remotes = git remote
if ($remotes -notcontains "origin") {
    Write-Host "📋 Please add your GitHub remote:" -ForegroundColor Yellow
    Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or use GitHub token:" -ForegroundColor Yellow
    Write-Host "   git remote add origin https://ghp_YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git" -ForegroundColor Yellow
    exit 1
}

# Push to GitHub
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
git add .
git commit -m "Deploy to production" 2>&1 | Out-Null
$branch = git branch --show-current
if ($branch -eq "main" -or $branch -eq "master") {
    git push origin $branch
} else {
    Write-Host "⚠️ Current branch is: $branch" -ForegroundColor Yellow
    Write-Host "Switching to main branch..." -ForegroundColor Yellow
    git checkout -b main 2>&1 | Out-Null
    git push origin main
}

Write-Host ""
Write-Host "✅ Code pushed to GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://render.com/" -ForegroundColor White
Write-Host "2. Click 'New' → 'Blueprint'" -ForegroundColor White
Write-Host "3. Select your repository" -ForegroundColor White
Write-Host "4. Render will deploy automatically!" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Don't forget to add Environment Variables in Render:" -ForegroundColor Yellow
Write-Host "   - WHATSAPP_ACCESS_TOKEN" -ForegroundColor White
Write-Host "   - WHATSAPP_PHONE_NUMBER_ID" -ForegroundColor White

