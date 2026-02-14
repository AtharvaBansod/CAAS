# Phase 4 Search Service Test
# Simplified version focusing on core functionality

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3000"
$testsPassed = 0
$testsFailed = 0

function Test-Feature {
    param($name, $scriptBlock)
    Write-Host "`n>>> Testing: $name" -ForegroundColor Yellow
    try {
        & $scriptBlock
        Write-Host "✓ PASS: $name" -ForegroundColor Green
        $script:testsPassed++
    } catch {
        Write-Host "✗ FAIL: $name - $($_.Exception.Message)" -ForegroundColor Red
        $script:testsFailed++
    }
}

function Invoke-Api {
    param($Method, $Endpoint, $Body, $Token)
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    $params = @{
        Uri = "$baseUrl$Endpoint"
        Method = $Method
        Headers = $headers
        UseBasicParsing = $true
        TimeoutSec = 30
    }
    if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Depth 10) }
    return Invoke-RestMethod @params
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 4 - Search Service Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 1: Elasticsearch Health
Test-Feature "Elasticsearch Cluster Health" {
    $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("elastic:changeme"))
    $headers = @{ Authorization = "Basic $auth" }
    $health = Invoke-RestMethod -Uri "http://localhost:9200/_cluster/health" -Headers $headers -UseBasicParsing
    if ($health.status -notin @('green', 'yellow')) { throw "Cluster unhealthy: $($health.status)" }
}

# Test 2: Search Service Health
Test-Feature "Search Service Health" {
    $health = Invoke-RestMethod -Uri "http://localhost:3006/health" -UseBasicParsing
    if ($health.status -ne "healthy") { throw "Service not healthy" }
}

# Test 3: Elasticsearch Indices
Test-Feature "Elasticsearch Indices Exist" {
    $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("elastic:changeme"))
    $headers = @{ Authorization = "Basic $auth" }
    $indices = Invoke-RestMethod -Uri "http://localhost:9200/_cat/indices?format=json" -Headers $headers -UseBasicParsing
    $required = @('messages', 'conversations', 'users')
    foreach ($idx in $required) {
        if (-not ($indices | Where-Object { $_.index -eq $idx })) {
            throw "Index '$idx' not found"
        }
    }
}

# Test 4: Create Tenant
$tenant = $null
Test-Feature "Create Tenant" {
    $script:tenant = Invoke-Api -Method POST -Endpoint "/v1/tenants" -Body @{
        name = "Search Test Tenant"
        domain = "searchtest.example.com"
        settings = @{ features = @{ search_enabled = $true } }
    }
    if (-not $tenant.id) { throw "No tenant ID returned" }
}

# Test 5: Create Application
$app = $null
$apiKey = $null
Test-Feature "Create Application" {
    $script:app = Invoke-Api -Method POST -Endpoint "/v1/applications" -Body @{
        name = "Search Test App"
        tenant_id = $tenant.id
    }
    $script:apiKey = $app.api_key
    if (-not $apiKey) { throw "No API key returned" }
}

# Test 6: Create Users
$users = @()
Test-Feature "Create Test Users" {
    for ($i = 1; $i -le 3; $i++) {
        $user = Invoke-Api -Method POST -Endpoint "/v1/users" -Body @{
            external_id = "search_user_$i"
            name = "Search User $i"
            email = "searchuser$i@test.com"
        } -Token $apiKey
        $script:users += $user
    }
    if ($users.Count -lt 3) { throw "Failed to create all users" }
}

# Test 7: Authenticate User
$token = $null
Test-Feature "Authenticate User" {
    $auth = Invoke-Api -Method POST -Endpoint "/v1/auth/token" -Body @{
        external_id = $users[0].external_id
        application_id = $app.id
    } -Token $apiKey
    $script:token = $auth.access_token
    if (-not $token) { throw "No access token returned" }
}

# Test 8: Create Conversation
$conversation = $null
Test-Feature "Create Conversation" {
    $script:conversation = Invoke-Api -Method POST -Endpoint "/v1/conversations" -Body @{
        type = "group"
        name = "Test Search Conversation"
        participant_ids = @($users[0].id, $users[1].id, $users[2].id)
    } -Token $token
    if (-not $conversation.id) { throw "No conversation ID returned" }
}

# Test 9: Create Messages
$messages = @()
Test-Feature "Create Test Messages" {
    $testTexts = @(
        "Hello everyone! Welcome to the team."
        "Let us discuss the new project requirements."
        "The deadline for the feature is next Friday."
        "Can someone review my pull request?"
        "Great work on the presentation!"
    )
    foreach ($text in $testTexts) {
        $msg = Invoke-Api -Method POST -Endpoint "/v1/messages" -Body @{
            conversation_id = $conversation.id
            type = "text"
            content = @{ text = $text }
        } -Token $token
        $script:messages += $msg
    }
    if ($messages.Count -lt 5) { throw "Failed to create all messages" }
}

# Wait for indexing
Write-Host "`n>>> Waiting 15 seconds for Elasticsearch indexing..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Test 10: Verify Messages Indexed
Test-Feature "Messages Indexed in Elasticsearch" {
    $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("elastic:changeme"))
    $headers = @{ Authorization = "Basic $auth" }
    $searchBody = @{ query = @{ match_all = @{} }; size = 0 } | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "http://localhost:9200/messages/_search" -Method POST -Headers $headers -Body $searchBody -ContentType "application/json" -UseBasicParsing
    $count = $result.hits.total.value
    Write-Host "  Messages in index: $count" -ForegroundColor Gray
    if ($count -eq 0) { throw "No messages indexed" }
}

# Test 11: Search API - Basic Search
Test-Feature "Search API - Basic Full-Text Search" {
    try {
        $result = Invoke-Api -Method GET -Endpoint "/v1/search/messages?query=project" -Token $token
        $hitCount = $result.hits.Count
        Write-Host "  Found $hitCount results for project" -ForegroundColor Gray
        if ($result.hits.Count -eq 0) { throw "No search results returned" }
    } catch {
        Write-Host "  Search endpoint may not be implemented yet" -ForegroundColor Yellow
        throw "Search API not available: $($_.Exception.Message)"
    }
}

# Test 12: Search API - Conversation Filter
Test-Feature "Search API - Conversation Filter" {
    try {
        $convId = $conversation.id
        $endpoint = '/v1/search/messages?query=team&conversation_id=' + $convId
        $result = Invoke-Api -Method GET -Endpoint $endpoint -Token $token
        $hitCount = $result.hits.Count
        Write-Host "  Found $hitCount results in conversation" -ForegroundColor Gray
    } catch {
        Write-Host "  Conversation filter may not be implemented" -ForegroundColor Yellow
        throw "Conversation filter failed: $($_.Exception.Message)"
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Tests: $($testsPassed + $testsFailed)" -ForegroundColor White
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })
$passRate = if (($testsPassed + $testsFailed) -gt 0) { [Math]::Round(($testsPassed / ($testsPassed + $testsFailed)) * 100, 2) } else { 0 }
Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 60) { "Yellow" } else { "Red" })
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "All tests passed! Search service is working correctly." -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed. Please review the errors above." -ForegroundColor Yellow
    exit 1
}
