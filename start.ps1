# CAAS Platform - Start Script
# Starts all services with proper initialization

param(
    [switch]$Clean,
    [switch]$Build
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CAAS Platform - Starting Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Docker is not running!" -ForegroundColor Red
        Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "Error: Docker is not installed or not accessible!" -ForegroundColor Red
    exit 1
}

# Clean volumes if requested
if ($Clean) {
    Write-Host "Cleaning up existing volumes..." -ForegroundColor Yellow
    docker compose down -v
    Write-Host "Volumes cleaned!" -ForegroundColor Green
    Write-Host ""
}

# Build if requested
if ($Build) {
    Write-Host "Building services..." -ForegroundColor Yellow
    docker compose build
    Write-Host "Build complete!" -ForegroundColor Green
    Write-Host ""
}

# Start services
Write-Host "Starting services..." -ForegroundColor Yellow
Write-Host ""

try {
    docker compose up -d
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to start services!" -ForegroundColor Red
        Write-Host "Check docker compose logs for details." -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host ""
    Write-Host "Services started successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Initialize system (replica set, collections, topics)
    Write-Host "Initializing system..." -ForegroundColor Yellow
    & .\init-system.ps1
    
    # Check service status
    Write-Host ""
    Write-Host "Service Status:" -ForegroundColor Cyan
    Write-Host "---------------" -ForegroundColor Cyan
    docker compose ps
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "CAAS Platform Started!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Access Points:" -ForegroundColor Yellow
    Write-Host "  Gateway API:        http://localhost:3000" -ForegroundColor White
    Write-Host "  Gateway Health:     http://localhost:3000/health" -ForegroundColor White
    Write-Host "  Gateway Docs:       http://localhost:3000/documentation" -ForegroundColor White
    Write-Host "  Kafka UI:           http://localhost:8080" -ForegroundColor White
    Write-Host "  Mongo Express:      http://localhost:8082" -ForegroundColor White
    Write-Host "  Redis Commander:    http://localhost:8083" -ForegroundColor White
    Write-Host ""
    Write-Host "Run './test-system.ps1' to verify all services" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    Write-Host "Error starting services: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
