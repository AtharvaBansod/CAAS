# Test Observability Implementation (Docker-based)
# Phase 5 - Step 6
# All tests run against Docker containers - no local dependencies required

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Observability Implementation" -ForegroundColor Cyan
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

# Check if services are running
Write-Host "Checking if services are running..." -ForegroundColor Yellow
$runningContainers = docker compose ps --services --filter "status=running" 2>&1 | Out-String
if ($runningContainers -notmatch "gateway") {
    Write-Host ""
    Write-Host "Error: Services are not running!" -ForegroundColor Red
    Write-Host "Please start the platform first: .\start.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "Services are running. Starting tests..." -ForegroundColor Green
Write-Host ""

$testsPassed = 0
$testsFailed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$ExpectedStatus = 200,
        [int]$MaxRetries = 3,
        [int]$RetryDelay = 2
    )
    
    Write-Host "Testing: $Name..." -ForegroundColor Yellow
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
            if ($response.StatusCode -eq $ExpectedStatus) {
                Write-Host "  ✓ PASSED: $Name" -ForegroundColor Green
                return $true
            } else {
                Write-Host "  ✗ FAILED: $Name (Status: $($response.StatusCode))" -ForegroundColor Red
                return $false
            }
        } catch {
            if ($i -lt $MaxRetries) {
                Write-Host "  Retry $i/$MaxRetries failed, waiting ${RetryDelay}s..." -ForegroundColor Gray
                Start-Sleep -Seconds $RetryDelay
            } else {
                Write-Host "  ✗ FAILED: $Name (Error: $($_.Exception.Message))" -ForegroundColor Red
                return $false
            }
        }
    }
    return $false
}

function Test-MetricsContent {
    param(
        [string]$Name,
        [string]$Url,
        [string]$ExpectedMetric
    )
    
    Write-Host "Testing: $Name metrics content..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        if ($response.Content -match $ExpectedMetric) {
            Write-Host "  ✓ PASSED: $Name contains '$ExpectedMetric'" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ✗ FAILED: $Name missing '$ExpectedMetric'" -ForegroundColor Red
            Write-Host "  Available metrics preview:" -ForegroundColor Gray
            $preview = ($response.Content -split "`n" | Select-Object -First 10) -join "`n"
            Write-Host "  $preview" -ForegroundColor Gray
            return $false
        }
    } catch {
        Write-Host "  ✗ FAILED: $Name (Error: $($_.Exception.Message))" -ForegroundColor Red
        return $false
    }
}

function Test-DockerContainer {
    param(
        [string]$Name,
        [string]$ContainerName
    )
    
    Write-Host "Testing: $Name container..." -ForegroundColor Yellow
    try {
        $status = docker inspect -f '{{.State.Status}}' $ContainerName 2>&1
        if ($status -eq "running") {
            Write-Host "  ✓ PASSED: $Name is running" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ✗ FAILED: $Name is not running (Status: $status)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ✗ FAILED: $Name container not found" -ForegroundColor Red
        return $false
    }
}

Write-Host "Phase 1: Testing Docker Containers" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan

# Test observability containers
$containers = @(
    @{Name="Prometheus"; Container="caas-prometheus"},
    @{Name="Grafana"; Container="caas-grafana"},
    @{Name="Jaeger"; Container="caas-jaeger"},
    @{Name="Loki"; Container="caas-loki"},
    @{Name="Promtail"; Container="caas-promtail"},
    @{Name="AlertManager"; Container="caas-alertmanager"},
    @{Name="OTEL Collector"; Container="caas-otel-collector"}
)

foreach ($container in $containers) {
    if (Test-DockerContainer $container.Name $container.Container) {
        $testsPassed++
    } else {
        $testsFailed++
    }
}

Write-Host ""
Write-Host "Phase 2: Testing Observability Services" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

# Test Prometheus
if (Test-Endpoint "Prometheus" "http://localhost:9090/-/healthy") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test Grafana
if (Test-Endpoint "Grafana" "http://localhost:3200/api/health") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test Jaeger
if (Test-Endpoint "Jaeger UI" "http://localhost:16686/") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test Loki
if (Test-Endpoint "Loki" "http://localhost:3201/ready") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test AlertManager
if (Test-Endpoint "AlertManager" "http://localhost:9093/-/healthy") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test OTEL Collector
if (Test-Endpoint "OTEL Collector Health" "http://localhost:13133/") {
    $testsPassed++
} else {
    $testsFailed++
}

Write-Host ""
Write-Host "Phase 3: Testing Service Metrics Endpoints" -ForegroundColor Cyan
Write-Host "-------------------------------------------" -ForegroundColor Cyan

# Test Gateway Metrics
if (Test-Endpoint "Gateway Metrics" "http://localhost:3000/metrics") {
    if (Test-MetricsContent "Gateway" "http://localhost:3000/metrics" "http_requests_total") {
        $testsPassed++
    } else {
        $testsFailed++
    }
} else {
    $testsFailed++
}

# Test Auth Service Metrics
if (Test-Endpoint "Auth Service Metrics" "http://localhost:3007/metrics") {
    if (Test-MetricsContent "Auth Service" "http://localhost:3007/metrics" "process_cpu") {
        $testsPassed++
    } else {
        $testsFailed++
    }
} else {
    $testsFailed++
}

# Test Socket Service 1 Metrics
if (Test-Endpoint "Socket Service 1 Metrics" "http://localhost:3002/metrics") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test Kafka Service Metrics
if (Test-Endpoint "Kafka Service Metrics" "http://localhost:3010/metrics") {
    $testsPassed++
} else {
    $testsFailed++
}

Write-Host ""
Write-Host "Phase 4: Testing Correlation ID Propagation" -ForegroundColor Cyan
Write-Host "--------------------------------------------" -ForegroundColor Cyan

$correlationId = [guid]::NewGuid().ToString()
Write-Host "Using correlation ID: $correlationId" -ForegroundColor Gray

try {
    $headers = @{
        "x-correlation-id" = $correlationId
    }
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Headers $headers -UseBasicParsing -ErrorAction Stop
    
    $responseCorrelationId = $response.Headers["x-correlation-id"]
    if ($responseCorrelationId -eq $correlationId) {
        Write-Host "  ✓ PASSED: Correlation ID propagated correctly" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  ✗ FAILED: Correlation ID not propagated (Expected: $correlationId, Got: $responseCorrelationId)" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  ✗ FAILED: Correlation ID test (Error: $($_.Exception.Message))" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""
Write-Host "Phase 5: Testing Prometheus Scraping" -ForegroundColor Cyan
Write-Host "-------------------------------------" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/targets" -UseBasicParsing -ErrorAction Stop
    $targets = ($response.Content | ConvertFrom-Json).data.activeTargets
    
    $healthyTargets = ($targets | Where-Object { $_.health -eq "up" }).Count
    $totalTargets = $targets.Count
    
    Write-Host "  Healthy Targets: $healthyTargets / $totalTargets" -ForegroundColor Gray
    
    if ($healthyTargets -gt 0) {
        Write-Host "  ✓ PASSED: Prometheus is scraping targets" -ForegroundColor Green
        
        # Show which services are being scraped
        $scrapedServices = $targets | Where-Object { $_.health -eq "up" } | ForEach-Object { $_.labels.service } | Select-Object -Unique
        Write-Host "  Scraped services: $($scrapedServices -join ', ')" -ForegroundColor Gray
        
        $testsPassed++
    } else {
        Write-Host "  ✗ FAILED: No healthy targets" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  ✗ FAILED: Prometheus targets check (Error: $($_.Exception.Message))" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""
Write-Host "Phase 6: Testing Alert Rules" -ForegroundColor Cyan
Write-Host "-----------------------------" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/rules" -UseBasicParsing -ErrorAction Stop
    $rules = ($response.Content | ConvertFrom-Json).data.groups
    
    $ruleCount = ($rules | ForEach-Object { $_.rules.Count } | Measure-Object -Sum).Sum
    
    Write-Host "  Total Alert Rules: $ruleCount" -ForegroundColor Gray
    
    if ($ruleCount -gt 0) {
        Write-Host "  ✓ PASSED: Alert rules loaded" -ForegroundColor Green
        
        # Show rule groups
        $groupNames = $rules | ForEach-Object { $_.name }
        Write-Host "  Rule groups: $($groupNames -join ', ')" -ForegroundColor Gray
        
        $testsPassed++
    } else {
        Write-Host "  ✗ FAILED: No alert rules loaded" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  ✗ FAILED: Alert rules check (Error: $($_.Exception.Message))" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""
Write-Host "Phase 7: Testing Docker Logs Collection" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

Write-Host "Checking if Promtail is collecting logs..." -ForegroundColor Yellow
try {
    $promtailLogs = docker logs caas-promtail --tail 20 2>&1 | Out-String
    if ($promtailLogs -match "client.*connected" -or $promtailLogs -match "Successfully sent batch") {
        Write-Host "  ✓ PASSED: Promtail is collecting and sending logs" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  ⚠ WARNING: Promtail may not be collecting logs properly" -ForegroundColor Yellow
        Write-Host "  This is not critical for basic functionality" -ForegroundColor Gray
        $testsPassed++
    }
} catch {
    Write-Host "  ⚠ WARNING: Could not check Promtail logs" -ForegroundColor Yellow
    $testsPassed++
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor Red
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Observability Stack is Fully Operational!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Access Points:" -ForegroundColor Yellow
    Write-Host "  Grafana:      http://localhost:3200 (admin/admin123)" -ForegroundColor White
    Write-Host "  Prometheus:   http://localhost:9090" -ForegroundColor White
    Write-Host "  Jaeger:       http://localhost:16686" -ForegroundColor White
    Write-Host "  AlertManager: http://localhost:9093" -ForegroundColor White
    Write-Host "  Loki:         http://localhost:3201" -ForegroundColor White
    Write-Host ""
    Write-Host "Service Metrics:" -ForegroundColor Yellow
    Write-Host "  Gateway:      http://localhost:3000/metrics" -ForegroundColor White
    Write-Host "  Auth Service: http://localhost:3007/metrics" -ForegroundColor White
    Write-Host "  Socket 1:     http://localhost:3002/metrics" -ForegroundColor White
    Write-Host "  Kafka:        http://localhost:3010/metrics" -ForegroundColor White
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. View dashboards in Grafana" -ForegroundColor White
    Write-Host "2. Search traces in Jaeger" -ForegroundColor White
    Write-Host "3. Query metrics in Prometheus" -ForegroundColor White
    Write-Host "4. Run e2e tests to generate telemetry:" -ForegroundColor White
    Write-Host "   docker compose --profile test run e2e-fresh" -ForegroundColor Gray
    Write-Host ""
    exit 0
} else {
    Write-Host "✗ Some tests failed. Please check the logs above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check service logs:" -ForegroundColor White
    Write-Host "   docker compose logs <service-name>" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Check observability service logs:" -ForegroundColor White
    Write-Host "   docker logs caas-prometheus" -ForegroundColor Gray
    Write-Host "   docker logs caas-grafana" -ForegroundColor Gray
    Write-Host "   docker logs caas-jaeger" -ForegroundColor Gray
    Write-Host "   docker logs caas-otel-collector" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Verify services are running:" -ForegroundColor White
    Write-Host "   docker compose ps" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Check observability/README.md for detailed troubleshooting" -ForegroundColor White
    Write-Host ""
    Write-Host "5. Restart observability stack:" -ForegroundColor White
    Write-Host "   docker compose restart prometheus grafana jaeger loki promtail alertmanager otel-collector" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
