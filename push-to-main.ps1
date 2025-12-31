# Push changes to idodanan1 / -rsvp-management-system main branch

Write-Host "Pushing to upstream/main (idodanan1 / -rsvp-management-system)..." -ForegroundColor Cyan

# Checkout main branch
Write-Host "`nChecking out main branch..." -ForegroundColor Yellow
git checkout main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to checkout main branch" -ForegroundColor Red
    exit 1
}

# Check status
Write-Host "`nCurrent status:" -ForegroundColor Yellow
git status

# Check for uncommitted changes
Write-Host "`nChecking for uncommitted changes..." -ForegroundColor Yellow
$uncommitted = git diff --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: You have uncommitted changes!" -ForegroundColor Yellow
    $commitChoice = Read-Host "Do you want to commit them? (Y/N)"
    if ($commitChoice -eq "Y" -or $commitChoice -eq "y") {
        $commitMsg = Read-Host "Enter commit message"
        git add .
        git commit -m $commitMsg
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Failed to commit changes" -ForegroundColor Red
            exit 1
        }
    }
}

# Push to upstream/main
Write-Host "`nPushing to upstream/main..." -ForegroundColor Yellow
git push upstream main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to push to upstream/main" -ForegroundColor Red
    exit 1
}

Write-Host "`nSuccessfully pushed to upstream/main!" -ForegroundColor Green
Write-Host "Repository: idodanan1 / -rsvp-management-system" -ForegroundColor Green
Write-Host "Branch: main" -ForegroundColor Green
