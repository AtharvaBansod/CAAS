# CAAS Platform - Stop Script
# Stops all running services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CAAS Platform - Stopping Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Stopping all services..." -ForegroundColor Yellow
    docker compose down -v
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "All services stopped successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Error stopping services!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
