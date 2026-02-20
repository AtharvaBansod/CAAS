# Phase 4.5.0 - Auth Service Test Script
# Tests standalone auth service functionality

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 4.5.0 - Auth Service Tests" -ForegroundColor Cyan
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
            # Handle HTTP error responses
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

# Test 1: Health Check
Write-Host "`n1. Health Check" -ForegroundColor Cyan
$health = Test-Endpoint -Name "Auth Service Health" -Method "GET" -Url "http://localhost:3007/health"

if ($health) {
    $healthData = $health.Content | ConvertFrom-Json
    Write-Host "  Service: $($healthData.service)" -ForegroundColor Gray
    Write-Host "  Status: $($healthData.status)" -ForegroundColor Gray
    Write-Host "  Uptime: $([math]::Round($healthData.uptime, 2))s" -ForegroundColor Gray
}

# Test 2: Ready Check
Write-Host "`n2. Ready Check" -ForegroundColor Cyan
Test-Endpoint -Name "Auth Service Ready" -Method "GET" -Url "http://localhost:3007/health/ready"

# Test 3: Token Validation (should fail without token)
Write-Host "`n3. Token Validation (No Token)" -ForegroundColor Cyan
$validateBody = @{
    token = "invalid_token"
} | ConvertTo-Json

Test-Endpoint -Name "Validate Invalid Token" -Method "POST" -Url "http://localhost:3007/api/v1/auth/validate" -Body $validateBody -ExpectedStatus 401

# Test 4: Login (should fail - no user exists yet)
Write-Host "`n4. Login Attempt (No User)" -ForegroundColor Cyan
$loginBody = @{
    email = "test@example.com"
    password = "password123"
    tenant_id = "test-tenant"
} | ConvertTo-Json

Test-Endpoint -Name "Login Non-Existent User" -Method "POST" -Url "http://localhost:3007/api/v1/auth/login" -Body $loginBody -ExpectedStatus 401

# Test 5: Session Info (should fail without auth)
Write-Host "`n5. Session Info (No Auth)" -ForegroundColor Cyan
Test-Endpoint -Name "Get Session Without Auth" -Method "GET" -Url "http://localhost:3007/api/v1/auth/session" -ExpectedStatus 400

# Test 6: List Sessions (should fail without auth)
Write-Host "`n6. List Sessions (No Auth)" -ForegroundColor Cyan
Test-Endpoint -Name "List Sessions Without Auth" -Method "GET" -Url "http://localhost:3007/api/v1/sessions" -ExpectedStatus 400

# Test 7: User Profile (should fail without auth)
Write-Host "`n7. User Profile (No Auth)" -ForegroundColor Cyan
Test-Endpoint -Name "Get Profile Without Auth" -Method "GET" -Url "http://localhost:3007/api/v1/users/profile" -ExpectedStatus 400

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor Red
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed!" -ForegroundColor Red
    exit 1
}
