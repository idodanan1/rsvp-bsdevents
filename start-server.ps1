# PowerShell script to start the development server
Write-Host "🚀 Starting Development Server..." -ForegroundColor Green
Write-Host ""

# Get the directory where this script is located
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "📁 Project directory: $ProjectDir" -ForegroundColor Cyan

# Change to the project directory
Set-Location $ProjectDir
Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Cyan

# Check if index.html exists
if (Test-Path "index.html") {
    Write-Host "✅ Found index.html" -ForegroundColor Green
} else {
    Write-Host "❌ index.html not found!" -ForegroundColor Red
    Write-Host "Files in current directory:" -ForegroundColor Yellow
    Get-ChildItem | Select-Object Name
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if package.json exists
if (Test-Path "package.json") {
    Write-Host "✅ Found package.json" -ForegroundColor Green
} else {
    Write-Host "❌ package.json not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "🔧 Starting Vite server from correct directory..." -ForegroundColor Yellow
npx vite --host 0.0.0.0 --port 5173
