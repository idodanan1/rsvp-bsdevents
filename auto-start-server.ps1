# Auto-start server script
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting RSVP Management System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get current directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Current directory: $scriptPath" -ForegroundColor Yellow
Write-Host ""

# Kill existing node processes
Write-Host "Stopping existing servers..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
}

# Start server in background
Write-Host "Starting server..." -ForegroundColor Yellow
$job = Start-Job -ScriptBlock {
    Set-Location $using:scriptPath
    npm run dev 2>&1
}

# Wait and test server
Write-Host "Waiting for server to start..." -ForegroundColor Yellow
$maxAttempts = 20
$attempt = 0
$success = $false

while ($attempt -lt $maxAttempts -and -not $success) {
    Start-Sleep -Seconds 2
    $attempt++
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  SUCCESS! Server is running!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Server URL: http://localhost:5173/" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Open your browser and go to:" -ForegroundColor Cyan
        Write-Host "  http://localhost:5173/" -ForegroundColor White
        Write-Host ""
        $success = $true
        break
    } catch {
        Write-Host "Attempt $attempt/$maxAttempts - Server not ready yet..." -ForegroundColor Gray
    }
}

if (-not $success) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Server failed to start!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Checking server output..." -ForegroundColor Yellow
    Receive-Job $job
    Stop-Job $job
    Remove-Job $job
    exit 1
}

# Keep job running
Write-Host "Server is running in background." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 10
        $test = try { 
            $null = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -UseBasicParsing
            $true 
        } catch { 
            $false 
        }
        if (-not $test) {
            Write-Host "WARNING: Server stopped responding!" -ForegroundColor Red
            Receive-Job $job
        }
    }
} finally {
    Stop-Job $job
    Remove-Job $job
    Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
}



