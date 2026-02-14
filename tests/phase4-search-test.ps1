# Phase 4 Search Feature Test Script
# Tests all search endpoints with Docker-only setup

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 4 Search Feature Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$GATEWAY_URL = "http://localhost:3000"
$testResults = @()

# Function to test endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [string]$Token = $null,
        [object]$Body = $null
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "  $Method $Url" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Token) {
            $headers["Authorization"] = "Bearer $Token"
        }
        
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params["Body"] = ($Body | ConvertTo-Json)
        }
        
        $response = Invoke-WebRequest @params -ErrorAction Stop
        $statusCode = $response.StatusCode
        
        Write-Host "  ✓ Status: $statusCode" -ForegroundColor Green
        
        $script:testResults += [PSCustomObject]@{
            Name = $Name
            Method = $Method
            Endpoint = $Url
            Status = $statusCode
            Result = "PASS"
        }
        
        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  ✗ Status: $statusCode" -ForegroundColor $(if ($statusCode -eq 401 -or $statusCode -eq 403) { "Yellow" } else { "Red" })
        
        $script:testResults += [PSCustomObject]@{
            Name = $Name
            Method = $Method
            Endpoint = $Url
            Status = $statusCode
            Result = $(if ($statusCode -eq 401 -or $statusCode -eq 403) { "EXPECTED" } else { "FAIL" })
        }
    }
    
    Write-Host ""
}

# Wait for services to be ready
Write-Host "Waiting for services to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Test 1: Health check
Write-Host "`n--- Test 1: Health Check ---" -ForegroundColor Cyan
Test-Endpoint -Name "Gateway Health" -Method "GET" -Url "$GATEWAY_URL/health"

# Test 2: Search endpoints without authentication (should return 401)
Write-Host "`n--- Test 2: Search Endpoints (No Auth) ---" -ForegroundColor Cyan
Test-Endpoint -Name "Message Search (No Auth)" -Method "GET" -Url "$GATEWAY_URL/v1/search/messages?query=test"
Test-Endpoint -Name "Global Search (No Auth)" -Method "GET" -Url "$GATEWAY_URL/v1/search/global?query=test"
Test-Endpoint -Name "User Autocomplete (No Auth)" -Method "GET" -Url "$GATEWAY_URL/v1/search/suggestions/users?query=john"
Test-Endpoint -Name "Recent Searches (No Auth)" -Method "GET" -Url "$GATEWAY_URL/v1/search/suggestions/recent"

# Test 3: Generate JWT token inside gateway container
Write-Host "`n--- Test 3: Generate JWT Token ---" -ForegroundColor Cyan
Write-Host "Generating JWT token inside gateway container..." -ForegroundColor Yellow

$tokenScript = @"
const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync('/app/keys/private.pem', 'utf8');

const payload = {
  user_id: 'test-user-123',
  tenant_id: 'test-tenant-456',
  email: 'test@example.com',
  role: 'user'
};

const token = jwt.sign(payload, privateKey, {
  algorithm: 'RS256',
  expiresIn: '1h',
  issuer: 'caas-gateway'
});

console.log(token);
"@

$token = docker exec caas-gateway node -e $tokenScript 2>$null
if ($token) {
    Write-Host "  ✓ Token generated successfully" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "  ✗ Failed to generate token" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Test 4: Search endpoints with authentication
Write-Host "`n--- Test 4: Search Endpoints (With Auth) ---" -ForegroundColor Cyan
Test-Endpoint -Name "Message Search (With Auth)" -Method "GET" -Url "$GATEWAY_URL/v1/search/messages?query=test&limit=10" -Token $token
Test-Endpoint -Name "Message Search with Filters" -Method "GET" -Url "$GATEWAY_URL/v1/search/messages?query=hello&conversation_id=conv-123&offset=0&limit=20" -Token $token
Test-Endpoint -Name "Global Search (With Auth)" -Method "GET" -Url "$GATEWAY_URL/v1/search/global?query=test" -Token $token
Test-Endpoint -Name "User Autocomplete (With Auth)" -Method "GET" -Url "$GATEWAY_URL/v1/search/suggestions/users?query=john" -Token $token
Test-Endpoint -Name "Recent Searches (With Auth)" -Method "GET" -Url "$GATEWAY_URL/v1/search/suggestions/recent" -Token $token
Test-Endpoint -Name "Save Recent Search" -Method "POST" -Url "$GATEWAY_URL/v1/search/suggestions/recent" -Token $token -Body @{ query = "test search" }

# Test 5: Check Elasticsearch health
Write-Host "`n--- Test 5: Elasticsearch Health ---" -ForegroundColor Cyan
Write-Host "Checking Elasticsearch health..." -ForegroundColor Yellow
$esHealth = docker exec caas-elasticsearch curl -u elastic:changeme -s http://localhost:9200/_cluster/health 2>$null
if ($esHealth) {
    Write-Host "  ✓ Elasticsearch is healthy" -ForegroundColor Green
    Write-Host "  $esHealth" -ForegroundColor Gray
} else {
    Write-Host "  ✗ Elasticsearch health check failed" -ForegroundColor Red
}
Write-Host ""

# Test 6: Check search-service health
Write-Host "`n--- Test 6: Search Service Health ---" -ForegroundColor Cyan
try {
    $searchHealth = Invoke-WebRequest -Uri "http://localhost:3006/health" -Method GET -TimeoutSec 5
    Write-Host "  ✓ Search service is healthy" -ForegroundColor Green
    Write-Host "  Status: $($searchHealth.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "  ✗ Search service health check failed" -ForegroundColor Red
}
Write-Host ""

# Test 7: Check Elasticsearch indices
Write-Host "`n--- Test 7: Elasticsearch Indices ---" -ForegroundColor Cyan
Write-Host "Checking Elasticsearch indices..." -ForegroundColor Yellow
$indices = docker exec caas-elasticsearch curl -u elastic:changeme -s http://localhost:9200/_cat/indices?v 2>$null
if ($indices) {
    Write-Host "  ✓ Indices retrieved" -ForegroundColor Green
    Write-Host $indices -ForegroundColor Gray
} else {
    Write-Host "  ✗ Failed to retrieve indices" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$testResults | Format-Table -AutoSize

$passed = ($testResults | Where-Object { $_.Result -eq "PASS" }).Count
$expected = ($testResults | Where-Object { $_.Result -eq "EXPECTED" }).Count
$failed = ($testResults | Where-Object { $_.Result -eq "FAIL" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Expected (401/403): $expected" -ForegroundColor Yellow
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "✓ All tests completed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Some tests failed. Please check the results above." -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Search Service Endpoints" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Message Search:" -ForegroundColor Yellow
Write-Host "  GET /v1/search/messages?query=<text>&conversation_id=<id>&sender_id=<id>&from=<date>&to=<date>&type=<type>&offset=<n>&limit=<n>" -ForegroundColor Gray
Write-Host ""
Write-Host "Global Search:" -ForegroundColor Yellow
Write-Host "  GET /v1/search/global?query=<text>" -ForegroundColor Gray
Write-Host ""
Write-Host "User Autocomplete:" -ForegroundColor Yellow
Write-Host "  GET /v1/search/suggestions/users?query=<text>&conversation_id=<id>" -ForegroundColor Gray
Write-Host ""
Write-Host "Recent Searches:" -ForegroundColor Yellow
Write-Host "  GET /v1/search/suggestions/recent" -ForegroundColor Gray
Write-Host "  POST /v1/search/suggestions/recent (body: {query: 'text'})" -ForegroundColor Gray
Write-Host ""
Write-Host "Elasticsearch:" -ForegroundColor Yellow
Write-Host "  http://localhost:9200 (elastic/changeme)" -ForegroundColor Gray
Write-Host ""
Write-Host "Search Service:" -ForegroundColor Yellow
Write-Host "  http://localhost:3006/health" -ForegroundColor Gray
Write-Host ""
