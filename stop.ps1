# CAAS Platform - Stop Script
# Stops all services gracefully

param(
    [switch]$Clean
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CAAS Platform - Stopping Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Docker is not running!" -ForegroundColor Yellow
        exit 0
    }
} catch {
    Write-Host "Warning: Docker is not accessible!" -ForegroundColor Yellow
    exit 0
}

# Stop services
Write-Host "Stopping services..." -ForegroundColor Yellow

try {
    if ($Clean) {
        Write-Host "Stopping and removing volumes..." -ForegroundColor Yellow
        docker compose down -v
        Write-Host ""
        Write-Host "All services stopped and volumes removed!" -ForegroundColor Green
    } else {
        docker compose down
        Write-Host ""
        Write-Host "All services stopped!" -ForegroundColor Green
        Write-Host "Data volumes preserved. Use -Clean to remove volumes." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "CAAS Platform Stopped!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "Error stopping services: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
