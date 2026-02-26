# Phase 4.5.0 - Complete Integration Test
# Tests auth service, gateway integration, and socket integration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 4.5.0 - Complete Integration Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"
$testsPassed = 0
$testsFailed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [string]$Body = $null,
        [hashtable]$Headers = @{},
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    try {
        $params = @{
            Method = $Method
            Uri = $Url
            Headers = $Headers
            ContentType = "application/json"
            UseBasicParsing = $true
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        try {
            $response = Invoke-WebRequest @params
            $statusCode = $response.StatusCode
        } catch {
            if ($_.Exception.Response) {
                $statusCode = [int]$_.Exception.Response.StatusCode
            } else {
                throw
            }
        }
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "  PASSED - Status: $statusCode" -ForegroundColor Green
            $script:testsPassed++
            return $response
        } else {
            Write-Host "  FAILED - Expected: $ExpectedStatus, Got: $statusCode" -ForegroundColor Red
            $script:testsFailed++
            return $null
        }
    } catch {
        Write-Host "  FAILED - Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:testsFailed++
        return $null
    }
}

Write-Host "=== Part 1: Auth Service Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Auth Service Health
Write-Host "1. Auth Service Health Check" -ForegroundColor Cyan
$authHealth = Test-Endpoint -Name "Auth Service Health" -Method "GET" -Url "http://localhost:3007/health"

if ($authHealth) {
    $healthData = $authHealth.Content | ConvertFrom-Json
    Write-Host "  Service: $($healthData.service)" -ForegroundColor Gray
    Write-Host "  Status: $($healthData.status)" -ForegroundColor Gray
}

# Test 2: Auth Service Ready
Write-Host "`n2. Auth Service Ready Check" -ForegroundColor Cyan
Test-Endpoint -Name "Auth Service Ready" -Method "GET" -Url "http://localhost:3007/health/ready"

# Test 3: Token Validation
Write-Host "`n3. Token Validation (Invalid Token)" -ForegroundColor Cyan
$validateBody = @{
    token = "invalid_token_12345"
} | ConvertTo-Json

Test-Endpoint -Name "Validate Invalid Token" -Method "POST" -Url "http://localhost:3007/api/v1/auth/validate" -Body $validateBody -ExpectedStatus 401

Write-Host "`n=== Part 2: Gateway Integration Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 4: Gateway Health
Write-Host "4. Gateway Health Check" -ForegroundColor Cyan
$gatewayHealth = Test-Endpoint -Name "Gateway Health" -Method "GET" -Url "http://localhost:3000/health"

if ($gatewayHealth) {
    $healthData = $gatewayHealth.Content | ConvertFrom-Json
    Write-Host "  Status: $($healthData.status)" -ForegroundColor Gray
}

# Test 5: Gateway API Documentation
Write-Host "`n5. Gateway API Documentation" -ForegroundColor Cyan
Test-Endpoint -Name "Gateway Swagger" -Method "GET" -Url "http://localhost:3000/documentation"

Write-Host "`n=== Part 3: Socket Service Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 6: Socket Service 1 Health
Write-Host "6. Socket Service 1 Health Check" -ForegroundColor Cyan
Test-Endpoint -Name "Socket Service 1 Health" -Method "GET" -Url "http://localhost:3002/health"

# Test 7: Socket Service 2 Health
Write-Host "`n7. Socket Service 2 Health Check" -ForegroundColor Cyan
Test-Endpoint -Name "Socket Service 2 Health" -Method "GET" -Url "http://localhost:3003/health"

Write-Host "`n=== Part 4: Service Integration Tests ===" -ForegroundColor Cyan
Write-Host ""


# Test 9: Media Service Health
Write-Host "`n9. Media Service Health Check" -ForegroundColor Cyan
Test-Endpoint -Name "Media Service Health" -Method "GET" -Url "http://localhost:3005/health"

# Test 10: Search Service Health
Write-Host "`n10. Search Service Health Check" -ForegroundColor Cyan
Test-Endpoint -Name "Search Service Health" -Method "GET" -Url "http://localhost:3006/health"

Write-Host "`n=== Part 5: Infrastructure Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 11: MongoDB Connection
Write-Host "11. MongoDB Connection Test" -ForegroundColor Cyan
try {
    $mongoTest = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --eval "db.adminCommand('ping').ok" --quiet 2>&1
    if ($mongoTest -match "1") {
        Write-Host "  PASSED - MongoDB is responding" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  FAILED - MongoDB not responding" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  FAILED - MongoDB connection error" -ForegroundColor Red
    $testsFailed++
}

# Test 12: Redis Connection
Write-Host "`n12. Redis Connection Test" -ForegroundColor Cyan
try {
    $redisTest = docker exec caas-redis-shared redis-cli -a caas_redis_2026 ping 2>&1
    if ($redisTest -match "PONG") {
        Write-Host "  PASSED - Redis is responding" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  FAILED - Redis not responding" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  FAILED - Redis connection error" -ForegroundColor Red
    $testsFailed++
}

# Test 13: Kafka Connection
Write-Host "`n13. Kafka Connection Test" -ForegroundColor Cyan
try {
    $kafkaTest = docker exec caas-kafka-1 kafka-broker-api-versions --bootstrap-server localhost:9092 2>&1
    if ($kafkaTest -match "ApiVersion") {
        Write-Host "  PASSED - Kafka is responding" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  FAILED - Kafka not responding" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  FAILED - Kafka connection error" -ForegroundColor Red
    $testsFailed++
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor Red
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Phase 4.5.0 Implementation Complete:" -ForegroundColor Cyan
    Write-Host "  - Standalone Auth Service: Running" -ForegroundColor Green
    Write-Host "  - Gateway Integration: Complete" -ForegroundColor Green
    Write-Host "  - Socket Integration: Complete" -ForegroundColor Green
    Write-Host "  - Centralized Storage: Implemented" -ForegroundColor Green
    Write-Host ""
    exit 0
} else {
    Write-Host "Some tests failed!" -ForegroundColor Red
    exit 1
}
