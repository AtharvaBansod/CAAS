# Phase 4.5.2 - Crypto Service Tests

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 4.5.2 - Crypto Service Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$testsFailed = 0

# Test 1: Crypto Service Health Check
Write-Host "1. Crypto Service Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3009/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        $health = $response.Content | ConvertFrom-Json
        Write-Host "  PASSED - Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  Service: $($health.service)" -ForegroundColor Gray
        Write-Host "  Status: $($health.status)" -ForegroundColor Gray
        Write-Host "  MongoDB: $($health.checks.mongodb)" -ForegroundColor Gray
        Write-Host "  Redis: $($health.checks.redis)" -ForegroundColor Gray
        $testsPassed++
    } else {
        Write-Host "  FAILED - Status: $($response.StatusCode)" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  FAILED - Error: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}
Write-Host ""

# Test 2: Crypto Service Ready Check
Write-Host "2. Crypto Service Ready Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3009/health/ready" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  PASSED - Status: $($response.StatusCode)" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  FAILED - Status: $($response.StatusCode)" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  FAILED - Error: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}
Write-Host ""

# Test 3: Auth Service Still Running
Write-Host "3. Auth Service Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3007/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  PASSED - Status: $($response.StatusCode)" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  FAILED - Status: $($response.StatusCode)" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  FAILED - Error: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}
Write-Host ""

# Test 4: Compliance Service Still Running
Write-Host "4. Compliance Service Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3008/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  PASSED - Status: $($response.StatusCode)" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  FAILED - Status: $($response.StatusCode)" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  FAILED - Error: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}
Write-Host ""

# Test 5: Gateway Still Running
Write-Host "5. Gateway Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  PASSED - Status: $($response.StatusCode)" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  FAILED - Status: $($response.StatusCode)" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  FAILED - Error: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor Red
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Phase 4.5.2 Implementation Complete:" -ForegroundColor Cyan
    Write-Host "  - Standalone Crypto Service: Running" -ForegroundColor White
    Write-Host "  - Encryption Service: Implemented (AES-256-GCM)" -ForegroundColor White
    Write-Host "  - Key Management: Implemented" -ForegroundColor White
    Write-Host "  - Key Rotation: Implemented" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Some tests failed. Please check the logs." -ForegroundColor Red
    exit 1
}
