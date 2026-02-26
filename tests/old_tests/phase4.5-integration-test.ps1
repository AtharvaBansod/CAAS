# Phase 4.5 Integration Test
# Tests Phase 4.5.1 (Compliance) and Phase 4.5.2 (Crypto) service integrations

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 4.5 Integration Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$testsFailed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            UseBasicParsing = $true
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "  PASSED" -ForegroundColor Green
            $script:testsPassed++
            return $true
        } else {
            Write-Host "  FAILED - Expected $ExpectedStatus, got $($response.StatusCode)" -ForegroundColor Red
            $script:testsFailed++
            return $false
        }
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq $ExpectedStatus) {
            Write-Host "  PASSED" -ForegroundColor Green
            $script:testsPassed++
            return $true
        }
        Write-Host "  FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $script:testsFailed++
        return $false
    }
}

Write-Host "Phase 4.5.1 - Compliance Service Tests" -ForegroundColor Cyan
Write-Host "---------------------------------------" -ForegroundColor Cyan
Write-Host ""

# Test 1: Compliance Service Health
Test-Endpoint -Name "Compliance Service Health" -Url "http://localhost:3008/health"

# Test 2: Compliance Service Ready
Test-Endpoint -Name "Compliance Service Ready" -Url "http://localhost:3008/health/ready"

# Test 3: Log Audit Event
$auditEvent = @{
    tenant_id = "test-tenant"
    user_id = "test-user"
    action = "test_action"
    resource_type = "test_resource"
    metadata = @{
        test = "data"
    }
}
Test-Endpoint -Name "Log Audit Event" -Url "http://localhost:3008/api/v1/audit/log" -Method "POST" -Body $auditEvent -ExpectedStatus 201

# Test 4: Log Audit Batch
$auditBatch = @{
    events = @(
        @{
            tenant_id = "test-tenant"
            action = "batch_action_1"
            resource_type = "test_resource"
        },
        @{
            tenant_id = "test-tenant"
            action = "batch_action_2"
            resource_type = "test_resource"
        }
    )
}
Test-Endpoint -Name "Log Audit Batch" -Url "http://localhost:3008/api/v1/audit/batch" -Method "POST" -Body $auditBatch -ExpectedStatus 201

# Test 5: Query Audit Logs
Test-Endpoint -Name "Query Audit Logs" -Url "http://localhost:3008/api/v1/audit/query?tenant_id=test-tenant"

# Test 6: Record Consent
$consent = @{
    user_id = "test-user"
    tenant_id = "test-tenant"
    consent_type = "marketing"
    consent_given = $true
    consent_text = "I agree to marketing communications"
    version = "1.0"
}
Test-Endpoint -Name "Record Consent" -Url "http://localhost:3008/api/v1/gdpr/consent" -Method "POST" -Body $consent -ExpectedStatus 201

# Test 7: Get Consent
Test-Endpoint -Name "Get Consent" -Url "http://localhost:3008/api/v1/gdpr/consent?user_id=test-user&tenant_id=test-tenant"

# Test 8: Submit GDPR Request
$gdprRequest = @{
    user_id = "test-user"
    tenant_id = "test-tenant"
    request_type = "export"
}
Test-Endpoint -Name "Submit GDPR Request" -Url "http://localhost:3008/api/v1/gdpr/request" -Method "POST" -Body $gdprRequest -ExpectedStatus 201

# Test 9: Create Retention Policy
$retentionPolicy = @{
    tenant_id = "test-tenant"
    name = "Test Policy"
    data_type = "messages"
    retention_days = 365
    is_active = $true
}
Test-Endpoint -Name "Create Retention Policy" -Url "http://localhost:3008/api/v1/retention/policy" -Method "POST" -Body $retentionPolicy -ExpectedStatus 201

# Test 10: Get Retention Policies
Test-Endpoint -Name "Get Retention Policies" -Url "http://localhost:3008/api/v1/retention/policy?tenant_id=test-tenant"

Write-Host ""
Write-Host "Phase 4.5.2 - Crypto Service Tests" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan
Write-Host ""

# Test 11: Crypto Service Health
Test-Endpoint -Name "Crypto Service Health" -Url "http://localhost:3009/health"

# Test 12: Crypto Service Ready
Test-Endpoint -Name "Crypto Service Ready" -Url "http://localhost:3009/health/ready"

# Test 13: Generate Encryption Key
$keyRequest = @{
    tenant_id = "test-tenant"
    key_type = "master"
}
$keyResponse = Invoke-RestMethod -Uri "http://localhost:3009/api/v1/keys/generate" -Method POST -Body ($keyRequest | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
if ($keyResponse.key_id) {
    Write-Host "Testing: Generate Encryption Key" -ForegroundColor Yellow
    Write-Host "  PASSED - Key ID: $($keyResponse.key_id)" -ForegroundColor Green
    $script:testsPassed++
    $global:testKeyId = $keyResponse.key_id
} else {
    Write-Host "Testing: Generate Encryption Key" -ForegroundColor Yellow
    Write-Host "  FAILED" -ForegroundColor Red
    $script:testsFailed++
}

# Test 14: Encrypt Data
if ($global:testKeyId) {
    $encryptRequest = @{
        key_id = $global:testKeyId
        plaintext = "Hello, World!"
    }
    $encryptResponse = Invoke-RestMethod -Uri "http://localhost:3009/api/v1/encrypt" -Method POST -Body ($encryptRequest | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
    if ($encryptResponse.ciphertext -and $encryptResponse.iv -and $encryptResponse.authTag) {
        Write-Host "Testing: Encrypt Data" -ForegroundColor Yellow
        Write-Host "  PASSED" -ForegroundColor Green
        $script:testsPassed++
        $global:encryptedData = $encryptResponse
    } else {
        Write-Host "Testing: Encrypt Data" -ForegroundColor Yellow
        Write-Host "  FAILED" -ForegroundColor Red
        $script:testsFailed++
    }
}

# Test 15: Decrypt Data
if ($global:testKeyId -and $global:encryptedData) {
    $decryptRequest = @{
        key_id = $global:testKeyId
        ciphertext = $global:encryptedData.ciphertext
        iv = $global:encryptedData.iv
        authTag = $global:encryptedData.authTag
    }
    $decryptResponse = Invoke-RestMethod -Uri "http://localhost:3009/api/v1/decrypt" -Method POST -Body ($decryptRequest | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
    if ($decryptResponse.plaintext -eq "Hello, World!") {
        Write-Host "Testing: Decrypt Data" -ForegroundColor Yellow
        Write-Host "  PASSED - Plaintext matches" -ForegroundColor Green
        $script:testsPassed++
    } else {
        Write-Host "Testing: Decrypt Data" -ForegroundColor Yellow
        Write-Host "  FAILED - Plaintext mismatch" -ForegroundColor Red
        $script:testsFailed++
    }
}

# Test 16: Get Tenant Keys
Test-Endpoint -Name "Get Tenant Keys" -Url "http://localhost:3009/api/v1/keys/test-tenant"

Write-Host ""
Write-Host "Service Health Checks" -ForegroundColor Cyan
Write-Host "---------------------" -ForegroundColor Cyan
Write-Host ""

# Test 17: Auth Service Health
Test-Endpoint -Name "Auth Service Health" -Url "http://localhost:3007/health"

# Test 18: Gateway Health
Test-Endpoint -Name "Gateway Health" -Url "http://localhost:3000/health"

# Test 19: Socket Service 1 Health
Test-Endpoint -Name "Socket Service 1 Health" -Url "http://localhost:3002/health"

# Test 20: Socket Service 2 Health
Test-Endpoint -Name "Socket Service 2 Health" -Url "http://localhost:3003/health"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed!" -ForegroundColor Red
    exit 1
}
