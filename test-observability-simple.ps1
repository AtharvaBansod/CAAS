# Test Observability Implementation (Docker-based) - Simple Version
# Phase 5 - Step 6

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Observability Implementation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Docker is not running!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error: Docker is not installed!" -ForegroundColor Red
    exit 1
}

# Check if services are running
Write-Host "Checking if services are running..." -ForegroundColor Yellow
$runningContainers = docker compose ps --services --filter "status=running" 2>&1 | Out-String
if ($runningContainers -notmatch "gateway") {
    Write-Host "Error: Services are not running! Please start: .\start.ps1" -ForegroundColor Red
    exit 1
}
Write-Host "Services are running!" -ForegroundColor Green
Write-Host ""

$testsPassed = 0
$testsFailed = 0

# Test Gateway Health
Write-Host "Testing Gateway..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  PASSED: Gateway is healthy" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "  FAILED: Gateway not responding" -ForegroundColor Red
    $testsFailed++
}

# Test Gateway Metrics
Write-Host "Testing Gateway Metrics..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/metrics" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200 -and $response.Content -match "http_requests_total") {
        Write-Host "  PASSED: Gateway metrics available" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  FAILED: Gateway metrics missing" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  FAILED: Cannot access gateway metrics" -ForegroundColor Red
    $testsFailed++
}

# Test Auth Service Metrics
Write-Host "Testing Auth Service Metrics..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3007/metrics" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  PASSED: Auth service metrics available" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "  FAILED: Cannot access auth service metrics" -ForegroundColor Red
    $testsFailed++
}

# Test Correlation ID
Write-Host "Testing Correlation ID Propagation..." -ForegroundColor Yellow
try {
    $correlationId = [guid]::NewGuid().ToString()
    $headers = @{ "x-correlation-id" = $correlationId }
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Headers $headers -UseBasicParsing -ErrorAction Stop
    $responseCorrelationId = $response.Headers["x-correlation-id"]
    if ($responseCorrelationId -eq $correlationId) {
        Write-Host "  PASSED: Correlation ID propagated" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  FAILED: Correlation ID not propagated" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  FAILED: Correlation test error" -ForegroundColor Red
    $testsFailed++
}

# Test Prometheus
Write-Host "Testing Prometheus..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9090/-/healthy" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  PASSED: Prometheus is healthy" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "  FAILED: Prometheus not responding" -ForegroundColor Red
    $testsFailed++
}

# Test Grafana
Write-Host "Testing Grafana..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3200/api/health" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  PASSED: Grafana is healthy" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "  FAILED: Grafana not responding" -ForegroundColor Red
    $testsFailed++
}

# Test Jaeger
Write-Host "Testing Jaeger..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:16686/" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  PASSED: Jaeger is healthy" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "  FAILED: Jaeger not responding" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor Red
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "SUCCESS: All tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access Points:" -ForegroundColor Yellow
    Write-Host "  Grafana:     http://localhost:3200 (admin/admin123)" -ForegroundColor White
    Write-Host "  Prometheus:  http://localhost:9090" -ForegroundColor White
    Write-Host "  Jaeger:      http://localhost:16686" -ForegroundColor White
    Write-Host ""
    Write-Host "Service Metrics:" -ForegroundColor Yellow
    Write-Host "  Gateway:     http://localhost:3000/metrics" -ForegroundColor White
    Write-Host "  Auth:        http://localhost:3007/metrics" -ForegroundColor White
    Write-Host ""
    exit 0
} else {
    Write-Host "FAILED: Some tests failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  docker compose logs <service-name>" -ForegroundColor White
    Write-Host "  docker compose ps" -ForegroundColor White
    Write-Host ""
    exit 1
}
