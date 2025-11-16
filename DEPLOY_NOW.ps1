# PowerShell Script - Deploy to GitHub and Render
# Usage: .\DEPLOY_NOW.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Deploy to Production" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed!" -ForegroundColor Red
    Write-Host "Please install Git from https://git-scm.com/" -ForegroundColor Yellow
    exit 1
}

# Check if we're in a git repo
if (-not (Test-Path ".git")) {
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git initialized" -ForegroundColor Green
}

# Add all files
Write-Host "📤 Adding files to Git..." -ForegroundColor Cyan
git add .
Write-Host "✅ Files added" -ForegroundColor Green

# Commit
Write-Host "💾 Creating commit..." -ForegroundColor Cyan
$commitMessage = "Deploy to production - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git commit -m $commitMessage 2>&1 | Out-Null
Write-Host "✅ Commit created" -ForegroundColor Green

# Set main branch
Write-Host "🌿 Setting main branch..." -ForegroundColor Cyan
git branch -M main 2>&1 | Out-Null
Write-Host "✅ Branch set to main" -ForegroundColor Green

# Check if remote exists
$remotes = git remote
if ($remotes -contains "origin") {
    Write-Host "📡 Remote 'origin' already exists" -ForegroundColor Yellow
    Write-Host "Current remote URL:" -ForegroundColor Yellow
    git remote get-url origin
    Write-Host ""
    $update = Read-Host "Do you want to update it? (y/n)"
    if ($update -eq "y" -or $update -eq "Y") {
        git remote remove origin
    } else {
        Write-Host "📤 Pushing to existing remote..." -ForegroundColor Cyan
        git push -u origin main
        Write-Host "✅ Code pushed to GitHub!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Next: Deploy on Render.com" -ForegroundColor Cyan
        Write-Host "1. Go to https://render.com/" -ForegroundColor White
        Write-Host "2. Click 'New' → 'Blueprint'" -ForegroundColor White
        Write-Host "3. Select your repository" -ForegroundColor White
        exit 0
    }
}

# Get GitHub username and repo name
Write-Host ""
Write-Host "📋 GitHub Repository Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "First, create a repository on GitHub:" -ForegroundColor Yellow
Write-Host "1. Go to https://github.com/new" -ForegroundColor White
Write-Host "2. Name: rsvp-management-system (or any name)" -ForegroundColor White
Write-Host "3. Select 'Private'" -ForegroundColor White
Write-Host "4. Click 'Create repository'" -ForegroundColor White
Write-Host ""
$username = Read-Host "Enter your GitHub username"
$repoName = Read-Host "Enter repository name (default: rsvp-management-system)"
if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = "rsvp-management-system"
}

# GitHub token (already provided)
$token = "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"

# Add remote
$remoteUrl = "https://${token}@github.com/${username}/${repoName}.git"
Write-Host ""
Write-Host "📡 Adding GitHub remote..." -ForegroundColor Cyan
git remote add origin $remoteUrl
Write-Host "✅ Remote added" -ForegroundColor Green

# Push to GitHub
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
try {
    git push -u origin main
    Write-Host "✅ Code pushed to GitHub successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error pushing to GitHub:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Make sure:" -ForegroundColor Yellow
    Write-Host "1. Repository exists on GitHub" -ForegroundColor White
    Write-Host "2. Username and repo name are correct" -ForegroundColor White
    Write-Host "3. Token has push permissions" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Code is on GitHub!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps - Deploy on Render:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to https://render.com/" -ForegroundColor White
Write-Host "2. Click 'Sign Up' (free)" -ForegroundColor White
Write-Host "3. Sign up with GitHub" -ForegroundColor White
Write-Host "4. Click 'New' then 'Blueprint'" -ForegroundColor White
Write-Host "5. Select repository: ${username}/${repoName}" -ForegroundColor White
Write-Host "6. Render will deploy automatically!" -ForegroundColor White
Write-Host ""
Write-Host "After deployment, add Environment Variables in Render:" -ForegroundColor Yellow
Write-Host "   Backend Environment:" -ForegroundColor White
Write-Host "   - WHATSAPP_ACCESS_TOKEN = your_token" -ForegroundColor White
Write-Host "   - WHATSAPP_PHONE_NUMBER_ID = 874204535776090" -ForegroundColor White
Write-Host ""
Write-Host "📡 Then update Webhook in Meta:" -ForegroundColor Yellow
Write-Host "   Callback URL: https://your-backend-url.onrender.com/api/whatsapp/webhook" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Green

