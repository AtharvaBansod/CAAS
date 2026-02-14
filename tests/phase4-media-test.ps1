# Phase 4 Media Test Script
# Tests MEDIA-001 to MEDIA-012

param(
    [string]$GatewayUrl = "http://localhost:3000"
)

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Phase 4 Media Route Test" -ForegroundColor Cyan
Write-Host "  Verifying MEDIA-001 to MEDIA-012 Routes" -ForegroundColor Cyan
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

# Test MinIO Health
Write-Host "`n=== Testing MinIO Health ===" -ForegroundColor Cyan
try {
    $minio = Invoke-WebRequest -Uri "http://localhost:9000/minio/health/live" -UseBasicParsing
    Write-Host "  MinIO Status: Healthy" -ForegroundColor Green
    $script:results.passed++
}
catch {
    Write-Host "  MinIO not responding!" -ForegroundColor Yellow
    $script:results.failed++
}

# Test Media Upload Routes (MEDIA-001, MEDIA-002)
Write-Host "`n=== Testing Media Upload Routes ===" -ForegroundColor Cyan
Test-Route -Name "POST /v1/media/upload" -Method "POST" -Url "$GatewayUrl/v1/media/upload"

# Test Media Metadata Routes (MEDIA-004)
Write-Host "`n=== Testing Media Metadata Routes ===" -ForegroundColor Cyan
Test-Route -Name "GET /v1/media/:id" -Method "GET" -Url "$GatewayUrl/v1/media/test123"
Test-Route -Name "GET /v1/media (List)" -Method "GET" -Url "$GatewayUrl/v1/media"
Test-Route -Name "DELETE /v1/media/:id" -Method "DELETE" -Url "$GatewayUrl/v1/media/test123" -ExpectedStatus 400

# Test Signed URL Routes (MEDIA-009)
Write-Host "`n=== Testing Signed URL Routes ===" -ForegroundColor Cyan
Test-Route -Name "GET /v1/media/:id/url" -Method "GET" -Url "$GatewayUrl/v1/media/test123/url"
Test-Route -Name "GET /v1/media/:id/download" -Method "GET" -Url "$GatewayUrl/v1/media/test123/download"

# Test Quota Routes (MEDIA-012)
Write-Host "`n=== Testing Quota Routes ===" -ForegroundColor Cyan
Test-Route -Name "GET /v1/media/quota" -Method "GET" -Url "$GatewayUrl/v1/media/quota"

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
    Write-Host "All media routes are properly registered!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: Routes return 401 (Unauthorized) as expected." -ForegroundColor Gray
    Write-Host "Full integration testing requires authentication setup." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Services:" -ForegroundColor Cyan
    Write-Host "  MinIO Console: http://localhost:9001" -ForegroundColor White
    Write-Host "  MinIO API:     http://localhost:9000" -ForegroundColor White
}
