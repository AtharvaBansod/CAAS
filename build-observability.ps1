# Build Observability Implementation (Docker-based)
# Phase 5 - Step 6
# All builds happen inside Docker containers - no local dependencies required

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building Observability Implementation" -ForegroundColor Cyan
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

Write-Host "Docker is running. Building services..." -ForegroundColor Green
Write-Host ""

# Step 1: Build all services with Docker Compose
Write-Host "Step 1: Building all services with Docker Compose..." -ForegroundColor Yellow
Write-Host "This will build the telemetry package and all services inside Docker containers." -ForegroundColor Gray
Write-Host ""

$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"

docker compose build --parallel gateway auth-service socket-service-1 socket-service-2 kafka-service search-service media-service compliance-service crypto-service admin-portal flexible-datastore

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Error: Docker build failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check Docker logs: docker compose logs" -ForegroundColor White
    Write-Host "2. Try building without cache: docker compose build --no-cache" -ForegroundColor White
    Write-Host "3. Check Dockerfile.common for errors" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Observability Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "All services built successfully inside Docker containers!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Start the platform: .\start.ps1" -ForegroundColor White
Write-Host "2. Test observability: .\test-observability.ps1" -ForegroundColor White
Write-Host "3. Access Grafana: http://localhost:3200 (admin/admin123)" -ForegroundColor White
Write-Host "4. Access Jaeger: http://localhost:16686" -ForegroundColor White
Write-Host "5. Access Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host ""
