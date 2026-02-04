# CAAS Platform Startup Script
# ============================================
# Single command to boot entire CAAS Phase 1 infrastructure

param(
    [switch]$Build,      # Force rebuild images
    [switch]$Verbose,    # Show detailed logs
    [switch]$Wait        # Wait for all services to be healthy
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                   CAAS Platform Startup                       ║" -ForegroundColor Cyan
Write-Host "║                   Phase 1 Infrastructure                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "🔍 Checking Docker..." -ForegroundColor Yellow
try {
    docker info 2>&1 | Out-Null
    Write-Host "   ✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "   ⚠️  .env file not found. Using default values." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Yellow
Write-Host ""

# Build command
$composeCmd = "docker compose up -d"
if ($Build) {
    $composeCmd += " --build"
    Write-Host "   📦 Building images..." -ForegroundColor Cyan
}

# Execute docker compose
Invoke-Expression $composeCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Failed to start services" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⏳ Waiting for services to initialize..." -ForegroundColor Yellow

if ($Wait) {
    # Wait for critical services
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        $attempt++
        Start-Sleep -Seconds 5
        
        # Check gateway health
        try {
            $response = docker exec caas-gateway sh -c "wget -qO- http://127.0.0.1:3000/health 2>/dev/null" 2>$null
            if ($response -match "ok") {
                Write-Host "   ✅ Gateway is healthy" -ForegroundColor Green
                break
            }
        } catch {}
        
        Write-Host "   ⏳ Waiting... (attempt $attempt/$maxAttempts)" -ForegroundColor Gray
    }
} else {
    Start-Sleep -Seconds 10
}

Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker compose ps --format "table {{.Name}}\t{{.Status}}"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                   ✅ CAAS Platform Started!                   ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access Points:" -ForegroundColor Cyan
Write-Host "   ┌─────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
Write-Host "   │ Gateway API:        http://localhost:3000               │" -ForegroundColor White
Write-Host "   │ API Documentation:  http://localhost:3000/documentation │" -ForegroundColor White
Write-Host "   │ Kafka UI:           http://localhost:8080               │" -ForegroundColor White
Write-Host "   │ MongoDB Express:    http://localhost:8082               │" -ForegroundColor White
Write-Host "   │                     (admin / admin123)                  │" -ForegroundColor DarkGray
Write-Host "   │ Redis Commander:    http://localhost:8083               │" -ForegroundColor White
Write-Host "   └─────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
Write-Host ""
Write-Host "📝 Commands:" -ForegroundColor Cyan
Write-Host "   Stop:     .\stop.ps1" -ForegroundColor White
Write-Host "   Test:     .\tests\system\test-system.ps1" -ForegroundColor White
Write-Host "   Logs:     docker compose logs -f gateway" -ForegroundColor White
Write-Host ""

if ($Verbose) {
    Write-Host "📋 Following logs (Ctrl+C to exit)..." -ForegroundColor Yellow
    docker compose logs -f
}
