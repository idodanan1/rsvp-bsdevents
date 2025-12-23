# Script to sync files from rsvp new bsd to rsvp-bsdevents and push to GitHub

$sourceDir = "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd"
$gitDir = "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp-bsdevents"

Write-Host "🔄 Syncing files to Git repository..." -ForegroundColor Cyan

# Copy all files except .git
Write-Host "📁 Copying files..." -ForegroundColor Yellow
Get-ChildItem -Path $sourceDir -Recurse -Exclude ".git", "node_modules", ".next" | ForEach-Object {
    $relativePath = $_.FullName.Substring($sourceDir.Length + 1)
    $destPath = Join-Path $gitDir $relativePath
    
    if ($_.PSIsContainer) {
        if (-not (Test-Path $destPath)) {
            New-Item -ItemType Directory -Path $destPath -Force | Out-Null
        }
    } else {
        $destDir = Split-Path $destPath -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item $_.FullName $destPath -Force
    }
}

Write-Host "✅ Files copied!" -ForegroundColor Green

# Change to git directory
Set-Location $gitDir

# Add all changes
Write-Host "➕ Adding files to Git..." -ForegroundColor Yellow
git add .

# Check if there are changes
$status = git status --porcelain
if ($status) {
    Write-Host "💾 Committing changes..." -ForegroundColor Yellow
    git commit -m "Update: Sync changes from project"
    
    Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
    git push
    
    Write-Host "✅ Done! Changes pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No changes to commit." -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🎉 Sync complete!" -ForegroundColor Green

