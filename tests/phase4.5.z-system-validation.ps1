# Phase 4.5.z System Validation Test
# Validates all Phase 4.5.z implementations

Write-Host "=== Phase 4.5.z System Validation ===" -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0
$SuccessCount = 0

# Test Gateway
Write-Host "Testing Gateway..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET -TimeoutSec 5
    Write-Host "  OK Gateway is healthy" -ForegroundColor Green
    $SuccessCount++
} catch {
    Write-Host "  FAIL Gateway is not responding" -ForegroundColor Red
    $ErrorCount++
}

# Test Auth Service
Write-Host "Testing Auth Service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3007/health" -Method GET -TimeoutSec 5
    Write-Host "  OK Auth Service is healthy" -ForegroundColor Green
    $SuccessCount++
} catch {
    Write-Host "  FAIL Auth Service is not responding" -ForegroundColor Red
    $ErrorCount++
}

# Test Compliance Service
Write-Host "Testing Compliance Service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3008/health" -Method GET -TimeoutSec 5
    Write-Host "  OK Compliance Service is healthy" -ForegroundColor Green
    $SuccessCount++
} catch {
    Write-Host "  FAIL Compliance Service is not responding" -ForegroundColor Red
    $ErrorCount++
}

# Test Crypto Service
Write-Host "Testing Crypto Service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3009/health" -Method GET -TimeoutSec 5
    Write-Host "  OK Crypto Service is healthy" -ForegroundColor Green
    $SuccessCount++
} catch {
    Write-Host "  FAIL Crypto Service is not responding" -ForegroundColor Red
    $ErrorCount++
}

# Test Media Service
Write-Host "Testing Media Service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3005/health" -Method GET -TimeoutSec 5
    Write-Host "  OK Media Service is healthy" -ForegroundColor Green
    $SuccessCount++
} catch {
    Write-Host "  FAIL Media Service is not responding" -ForegroundColor Red
    $ErrorCount++
}

# Test Search Service
Write-Host "Testing Search Service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3006/health" -Method GET -TimeoutSec 5
    Write-Host "  OK Search Service is healthy" -ForegroundColor Green
    $SuccessCount++
} catch {
    Write-Host "  FAIL Search Service is not responding" -ForegroundColor Red
    $ErrorCount++
}

# Test Socket Services
Write-Host "Testing Socket Service 1..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/health" -Method GET -TimeoutSec 5
    Write-Host "  OK Socket Service 1 is healthy" -ForegroundColor Green
    $SuccessCount++
} catch {
    Write-Host "  FAIL Socket Service 1 is not responding" -ForegroundColor Red
    $ErrorCount++
}

Write-Host "Testing Socket Service 2..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3003/health" -Method GET -TimeoutSec 5
    Write-Host "  OK Socket Service 2 is healthy" -ForegroundColor Green
    $SuccessCount++
} catch {
    Write-Host "  FAIL Socket Service 2 is not responding" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""
Write-Host "Testing MongoDB..." -ForegroundColor Yellow
try {
    docker exec caas-mongodb-primary mongosh --quiet --eval "db.adminCommand('ping')" | Out-Null
    Write-Host "  OK MongoDB is responding" -ForegroundColor Green
    $SuccessCount++
} catch {
    Write-Host "  FAIL MongoDB is not responding" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""
Write-Host "Testing User Registration and Login..." -ForegroundColor Yellow
$TEST_EMAIL = "test-$(Get-Random)@example.com"
$TEST_PASSWORD = "Test123!@#"

try {
    # Register
    $registerBody = @{
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
        name = "Test User"
    } | ConvertTo-Json

    $registerResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" `
        -Method POST `
        -Body $registerBody `
        -ContentType "application/json"

    Write-Host "  OK User registration successful" -ForegroundColor Green
    $SuccessCount++

    # Login
    $loginBody = @{
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"

    Write-Host "  OK User login successful" -ForegroundColor Green
    Write-Host "    User ID: $($loginResponse.user.user_id)" -ForegroundColor Gray
    Write-Host "    Tenant ID: $($loginResponse.user.tenant_id)" -ForegroundColor Gray
    $SuccessCount++
} catch {
    Write-Host "  FAIL Authentication test failed" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    $ErrorCount++
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Passed: $SuccessCount" -ForegroundColor Green
Write-Host "Failed: $ErrorCount" -ForegroundColor Red
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "=== All Tests Passed ===" -ForegroundColor Green
    exit 0
} else {
    Write-Host "=== Some Tests Failed ===" -ForegroundColor Red
    exit 1
}
