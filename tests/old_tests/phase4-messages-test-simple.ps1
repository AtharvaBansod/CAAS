# Phase 4 Messages Test Script - Simple Version
# Tests that message routes are properly registered

param(
    [string]$GatewayUrl = "http://localhost:3000"
)

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Phase 4 Messages Route Test" -ForegroundColor Cyan
Write-Host "  Verifying MSG-001 to MSG-012 Routes" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$results = @{
    passed = 0
    failed = 0
}

function Test-Route {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [int]$ExpectedStatus = 401
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
            ErrorAction = "Stop"
            UseBasicParsing = $true
        }
        
        if ($Method -eq "POST" -or $Method -eq "PUT") {
            $params.Body = '{"test":"data"}'
        }
        
        try {
            $response = Invoke-WebRequest @params
            $actualStatus = $response.StatusCode
        }
        catch {
            $actualStatus = $_.Exception.Response.StatusCode.value__
        }
        
        if ($actualStatus -eq $ExpectedStatus) {
            Write-Host "  Success: Route exists and returns $actualStatus" -ForegroundColor Green
            $script:results.passed++
        } else {
            Write-Host "  Failed: Expected $ExpectedStatus but got $actualStatus" -ForegroundColor Red
            $script:results.failed++
        }
    }
    catch {
        Write-Host "  Failed: $($_.Exception.Message)" -ForegroundColor Red
        $script:results.failed++
    }
}

# Test Gateway Health
Write-Host "`n=== Testing Gateway Health ===" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$GatewayUrl/health" -UseBasicParsing
    Write-Host "  Gateway Status: $($health.status)" -ForegroundColor Green
    $script:results.passed++
}
catch {
    Write-Host "  Gateway not responding!" -ForegroundColor Red
    $script:results.failed++
    exit 1
}

# Test Message Routes (MSG-001 to MSG-004)
Write-Host "`n=== Testing Message CRUD Routes ===" -ForegroundColor Cyan
Test-Route -Name "POST /v1/messages (Send Message)" -Method "POST" -Url "$GatewayUrl/v1/messages" -ExpectedStatus 400
Test-Route -Name "GET /v1/messages/conversations/:id" -Method "GET" -Url "$GatewayUrl/v1/messages/conversations/test123"
Test-Route -Name "GET /v1/messages/:id" -Method "GET" -Url "$GatewayUrl/v1/messages/test123"
Test-Route -Name "PUT /v1/messages/:id (Edit)" -Method "PUT" -Url "$GatewayUrl/v1/messages/test123" -ExpectedStatus 400
Test-Route -Name "DELETE /v1/messages/:id" -Method "DELETE" -Url "$GatewayUrl/v1/messages/test123" -ExpectedStatus 400

# Test Reaction Routes (MSG-009)
Write-Host "`n=== Testing Reaction Routes ===" -ForegroundColor Cyan
Test-Route -Name "POST /v1/messages/:id/reactions" -Method "POST" -Url "$GatewayUrl/v1/messages/test123/reactions" -ExpectedStatus 400
Test-Route -Name "GET /v1/messages/:id/reactions" -Method "GET" -Url "$GatewayUrl/v1/messages/test123/reactions"
Test-Route -Name "DELETE /v1/messages/:id/reactions" -Method "DELETE" -Url "$GatewayUrl/v1/messages/test123/reactions" -ExpectedStatus 400

# Test Reply/Thread Routes (MSG-010)
Write-Host "`n=== Testing Reply/Thread Routes ===" -ForegroundColor Cyan
Test-Route -Name "POST /v1/messages/:id/replies" -Method "POST" -Url "$GatewayUrl/v1/messages/test123/replies" -ExpectedStatus 400
Test-Route -Name "GET /v1/messages/:id/replies" -Method "GET" -Url "$GatewayUrl/v1/messages/test123/replies"

# Test Forward Routes (MSG-011)
Write-Host "`n=== Testing Forward Routes ===" -ForegroundColor Cyan
Test-Route -Name "POST /v1/messages/:id/forward" -Method "POST" -Url "$GatewayUrl/v1/messages/test123/forward" -ExpectedStatus 400

# Test Edit History Routes (MSG-012)
Write-Host "`n=== Testing Edit History Routes ===" -ForegroundColor Cyan
Test-Route -Name "GET /v1/messages/:id/history" -Method "GET" -Url "$GatewayUrl/v1/messages/test123/history"

# Summary
Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Passed:  $($results.passed)" -ForegroundColor Green
Write-Host "Failed:  $($results.failed)" -ForegroundColor Red
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

if ($results.failed -gt 0) {
    Write-Host "Some routes failed. Check the output above." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "All message routes are properly registered!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: Routes return 401 (Unauthorized) as expected." -ForegroundColor Gray
    Write-Host "Full integration testing requires authentication setup." -ForegroundColor Gray
}
