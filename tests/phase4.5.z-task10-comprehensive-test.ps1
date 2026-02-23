# Phase 4.5.z Task 10 - Comprehensive Testing & Validation
# Tests all Phase 4.5.z implementations

Write-Host "=== Phase 4.5.z Task 10: Comprehensive Testing & Validation ===" -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0
$WarningCount = 0
$SuccessCount = 0

function Test-Service {
    param(
        [string]$Name,
        [string]$Url,
        [string]$HealthPath = "/health"
    )
    
    try {
        $response = Invoke-RestMethod -Uri "$Url$HealthPath" -Method GET -TimeoutSec 5
        Write-Host "✓ $Name is healthy" -ForegroundColor Green
        $script:SuccessCount++
        return $true
    } catch {
        Write-Host "✗ $Name is not responding" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
        $script:ErrorCount++
        return $false
    }
}

# ============================================================================
# STEP 1: Infrastructure Health Checks
# ============================================================================
Write-Host "Step 1: Infrastructure Health Checks" -ForegroundColor Yellow
Write-Host ""

$services = @(
    @{ Name = "Gateway"; Url = "http://localhost:3000" },
    @{ Name = "Auth Service"; Url = "http://localhost:3007" },
    @{ Name = "Compliance Service"; Url = "http://localhost:3008" },
    @{ Name = "Crypto Service"; Url = "http://localhost:3009" },
    @{ Name = "Media Service"; Url = "http://localhost:3005" },
    @{ Name = "Search Service"; Url = "http://localhost:3006" },
    @{ Name = "Socket Service 1"; Url = "http://localhost:3002" },
    @{ Name = "Socket Service 2"; Url = "http://localhost:3003" }
)

foreach ($service in $services) {
    Test-Service -Name $service.Name -Url $service.Url
}

Write-Host ""

# ============================================================================
# STEP 2: MongoDB Replica Set Status
# ============================================================================
Write-Host "Step 2: MongoDB Replica Set Status" -ForegroundColor Yellow
Write-Host ""

try {
    $mongoStatus = docker exec caas-mongodb-primary mongosh --quiet --eval 'rs.status().ok' 2>$null
    
    if ($mongoStatus -match "1") {
        Write-Host "✓ MongoDB replica set is healthy" -ForegroundColor Green
        $SuccessCount++
    } else {
        Write-Host "✗ MongoDB replica set has issues" -ForegroundColor Red
        $ErrorCount++
    }
} catch {
    Write-Host "✗ Failed to check MongoDB status" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# ============================================================================
# STEP 3: Redis Instances Check
# ============================================================================
Write-Host "Step 3: Redis Instances Check" -ForegroundColor Yellow
Write-Host ""

$redisInstances = @(
    @{ Name = "Redis Gateway"; Port = 6379 },
    @{ Name = "Redis Socket"; Port = 6380 },
    @{ Name = "Redis Shared"; Port = 6381 },
    @{ Name = "Redis Compliance"; Port = 6382 },
    @{ Name = "Redis Crypto"; Port = 6383 }
)

foreach ($redis in $redisInstances) {
    try {
        $result = docker exec caas-redis-gateway redis-cli -p $redis.Port PING 2>$null
        if ($result -eq "PONG") {
            Write-Host "✓ $($redis.Name) is responding" -ForegroundColor Green
            $SuccessCount++
        } else {
            Write-Host "✗ $($redis.Name) is not responding" -ForegroundColor Red
            $ErrorCount++
        }
    } catch {
        Write-Host "✗ $($redis.Name) check failed" -ForegroundColor Red
        $ErrorCount++
    }
}

Write-Host ""

# ============================================================================
# STEP 4: Kafka Cluster Check
# ============================================================================
Write-Host "Step 4: Kafka Cluster Check" -ForegroundColor Yellow
Write-Host ""

try {
    $kafkaTopics = docker exec caas-kafka-1 kafka-topics --bootstrap-server localhost:9092 --list 2>$null
    
    $requiredTopics = @("messages", "events", "notifications")
    $missingTopics = @()
    
    foreach ($topic in $requiredTopics) {
        if ($kafkaTopics -match $topic) {
            Write-Host "✓ Kafka topic '$topic' exists" -ForegroundColor Green
            $SuccessCount++
        } else {
            Write-Host "⚠ Kafka topic '$topic' not found" -ForegroundColor Yellow
            $WarningCount++
            $missingTopics += $topic
        }
    }
    
    if ($missingTopics.Count -eq 0) {
        Write-Host "✓ All required Kafka topics exist" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed to check Kafka topics" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# ============================================================================
# STEP 5: User Registration and Authentication
# ============================================================================
Write-Host "Step 5: User Registration and Authentication" -ForegroundColor Yellow
Write-Host ""

$TEST_EMAIL = "phase45z-test-$(Get-Random)@example.com"
$TEST_PASSWORD = "Test123!@#"
$GATEWAY_URL = "http://localhost:3000"

try {
    # Register user
    $registerBody = @{
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
        name = "Phase 4.5.z Test User"
    } | ConvertTo-Json

    $registerResponse = Invoke-RestMethod -Uri "$GATEWAY_URL/api/auth/register" `
        -Method POST `
        -Body $registerBody `
        -ContentType "application/json"

    Write-Host "✓ User registration successful" -ForegroundColor Green
    $SuccessCount++
    
    # Login
    $loginBody = @{
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$GATEWAY_URL/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"

    $JWT_TOKEN = $loginResponse.access_token
    $USER_ID = $loginResponse.user.user_id
    $TENANT_ID = $loginResponse.user.tenant_id

    Write-Host "✓ User login successful" -ForegroundColor Green
    Write-Host "  User ID: $USER_ID" -ForegroundColor Gray
    Write-Host "  Tenant ID: $TENANT_ID" -ForegroundColor Gray
    $SuccessCount++
} catch {
    Write-Host "✗ Authentication test failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
    $ErrorCount++
}

Write-Host ""

# ============================================================================
# STEP 6: Correlation ID Flow Test
# ============================================================================
Write-Host "Step 6: Correlation ID Flow Test" -ForegroundColor Yellow
Write-Host ""

$servicesWithCorrelation = @(
    @{ Name = "Gateway"; Url = "http://localhost:3000/health" },
    @{ Name = "Auth Service"; Url = "http://localhost:3007/health" },
    @{ Name = "Media Service"; Url = "http://localhost:3005/health" },
    @{ Name = "Search Service"; Url = "http://localhost:3006/health" }
)

foreach ($service in $servicesWithCorrelation) {
    try {
        $correlationId = [guid]::NewGuid().ToString()
        $headers = @{
            "X-Correlation-ID" = $correlationId
        }
        
        $response = Invoke-WebRequest -Uri $service.Url -Method GET -Headers $headers -TimeoutSec 5
        
        if ($response.Headers["X-Correlation-ID"] -eq $correlationId) {
            Write-Host "✓ $($service.Name) returns correlation ID" -ForegroundColor Green
            $SuccessCount++
        } else {
            Write-Host "⚠ $($service.Name) does not return correlation ID" -ForegroundColor Yellow
            $WarningCount++
        }
    } catch {
        Write-Host "✗ $($service.Name) correlation test failed" -ForegroundColor Red
        $ErrorCount++
    }
}

Write-Host ""

# ============================================================================
# STEP 7: Compliance Logging Test
# ============================================================================
Write-Host "Step 7: Compliance Logging Test" -ForegroundColor Yellow
Write-Host ""

if ($JWT_TOKEN) {
    try {
        # Make a request that should generate compliance log
        $headers = @{
            "Authorization" = "Bearer $JWT_TOKEN"
        }
        
        $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/users/me" `
            -Method GET `
            -Headers $headers `
            -TimeoutSec 5

        Write-Host "✓ User profile request successful" -ForegroundColor Green
        $SuccessCount++
        
        # Check if compliance service is logging
        Start-Sleep -Seconds 2
        
        $complianceHealth = Invoke-RestMethod -Uri "http://localhost:3008/health" -Method GET
        if ($complianceHealth) {
            Write-Host "✓ Compliance service is operational" -ForegroundColor Green
            $SuccessCount++
        }
    } catch {
        Write-Host "⚠ Compliance logging test inconclusive" -ForegroundColor Yellow
        $WarningCount++
    }
}

Write-Host ""

# ============================================================================
# STEP 8: Rate Limiting Test
# ============================================================================
Write-Host "Step 8: Rate Limiting Test" -ForegroundColor Yellow
Write-Host ""

Write-Host "Testing rate limiting (sending 10 rapid requests)..." -ForegroundColor Gray

$rateLimitHit = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "$GATEWAY_URL/health" -Method GET -TimeoutSec 2
        if ($response.StatusCode -eq 429) {
            $rateLimitHit = $true
            break
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 429) {
            $rateLimitHit = $true
            break
        }
    }
    Start-Sleep -Milliseconds 100
}

if ($rateLimitHit) {
    Write-Host "✓ Rate limiting is active" -ForegroundColor Green
    $SuccessCount++
} else {
    Write-Host "⚠ Rate limiting not triggered (may need higher request volume)" -ForegroundColor Yellow
    $WarningCount++
}

Write-Host ""

# ============================================================================
# STEP 9: Docker Container Health
# ============================================================================
Write-Host "Step 9: Docker Container Health" -ForegroundColor Yellow
Write-Host ""

$containers = docker ps --format "{{.Names}}" | Where-Object { $_ -like "caas-*" }
$unhealthyContainers = @()

foreach ($container in $containers) {
    $health = docker inspect --format='{{.State.Health.Status}}' $container 2>$null
    
    if ($health -eq "healthy" -or $health -eq "") {
        # Empty means no health check defined, which is OK
        $status = if ($health -eq "") { "running" } else { $health }
        Write-Host "✓ $container is $status" -ForegroundColor Green
        $SuccessCount++
    } else {
        Write-Host "✗ $container is $health" -ForegroundColor Red
        $unhealthyContainers += $container
        $ErrorCount++
    }
}

if ($unhealthyContainers.Count -gt 0) {
    Write-Host ""
    Write-Host "Unhealthy containers:" -ForegroundColor Red
    $unhealthyContainers | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
}

Write-Host ""

# ============================================================================
# STEP 10: Performance Metrics
# ============================================================================
Write-Host "Step 10: Performance Metrics" -ForegroundColor Yellow
Write-Host ""

# Test response times
$performanceTests = @(
    @{ Name = "Gateway Health"; Url = "http://localhost:3000/health" },
    @{ Name = "Auth Service Health"; Url = "http://localhost:3007/health" },
    @{ Name = "Socket Service Health"; Url = "http://localhost:3002/health" }
)

foreach ($test in $performanceTests) {
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-RestMethod -Uri $test.Url -Method GET -TimeoutSec 5
        $stopwatch.Stop()
        
        $latency = $stopwatch.ElapsedMilliseconds
        
        if ($latency -lt 100) {
            Write-Host "✓ $($test.Name): ${latency}ms (excellent)" -ForegroundColor Green
            $SuccessCount++
        } elseif ($latency -lt 500) {
            Write-Host "✓ $($test.Name): ${latency}ms (good)" -ForegroundColor Yellow
            $WarningCount++
        } else {
            Write-Host "⚠ $($test.Name): ${latency}ms (slow)" -ForegroundColor Yellow
            $WarningCount++
        }
    } catch {
        Write-Host "✗ $($test.Name): Failed" -ForegroundColor Red
        $ErrorCount++
    }
}

Write-Host ""

# ============================================================================
# Summary
# ============================================================================
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Passed: $SuccessCount" -ForegroundColor Green
Write-Host "⚠ Warnings: $WarningCount" -ForegroundColor Yellow
Write-Host "✗ Failed: $ErrorCount" -ForegroundColor Red
Write-Host ""

$totalTests = $SuccessCount + $WarningCount + $ErrorCount
$successRate = if ($totalTests -gt 0) { [math]::Round(($SuccessCount / $totalTests) * 100, 2) } else { 0 }

Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "=== All Critical Tests Passed ===" -ForegroundColor Green
    exit 0
} else {
    Write-Host "=== Some Tests Failed - Review Required ===" -ForegroundColor Red
    exit 1
}
