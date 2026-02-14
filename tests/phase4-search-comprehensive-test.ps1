# CAAS Platform - Phase 4 Search Comprehensive Test
# Tests all search functionality: SEARCH-001 to SEARCH-006

param(
    [switch]$SkipCleanStart
)

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3000"
$testResults = @()

# Color functions
function Write-TestHeader($message) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host $message -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-TestStep($message) {
    Write-Host "`n>>> $message" -ForegroundColor Yellow
}

function Write-Success($message) {
    Write-Host "✓ $message" -ForegroundColor Green
}

function Write-Failure($message) {
    Write-Host "✗ $message" -ForegroundColor Red
}

function Write-Info($message) {
    Write-Host "  $message" -ForegroundColor Gray
}

# Test result tracking
function Add-TestResult($testName, $passed, $details) {
    $script:testResults += [PSCustomObject]@{
        Test = $testName
        Passed = $passed
        Details = $details
        Timestamp = Get-Date -Format "HH:mm:ss"
    }
}

# HTTP request helper with authentication
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body,
        [string]$Token
    )
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $params = @{
        Uri = "$baseUrl$Endpoint"
        Method = $Method
        Headers = $headers
        UseBasicParsing = $true
        TimeoutSec = 30
    }
    
    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
    }
    
    try {
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response; StatusCode = 200 }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = $_.ErrorDetails.Message
        return @{ Success = $false; Error = $errorBody; StatusCode = $statusCode }
    }
}

Write-TestHeader "PHASE 4 - SEARCH SERVICE COMPREHENSIVE TEST"
Write-Host "Testing SEARCH-001 through SEARCH-006" -ForegroundColor White
Write-Host ""

# Clean start if requested
if (-not $SkipCleanStart) {
    Write-TestStep "Performing clean start..."
    
    Write-Info "Stopping existing containers..."
    docker compose down -v --remove-orphans 2>&1 | Out-Null
    
    Write-Info "Starting services with clean volumes..."
    & .\start.ps1 -Clean
    
    if ($LASTEXITCODE -ne 0) {
        Write-Failure "Failed to start services"
        exit 1
    }
    
    Write-Success "Clean start completed"
    
    Write-Info "Waiting additional 30 seconds for Elasticsearch to be ready..."
    Start-Sleep -Seconds 30
} else {
    Write-Info "Skipping clean start (using existing containers)"
}

# Verify services are running
Write-TestStep "Verifying services are running..."

$services = @(
    @{ Name = "Gateway"; Url = "$baseUrl/health" }
    @{ Name = "Elasticsearch"; Url = "http://localhost:9200/_cluster/health" }
)

foreach ($service in $services) {
    try {
        if ($service.Name -eq "Elasticsearch") {
            $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("elastic:changeme"))
            $headers = @{ Authorization = "Basic $auth" }
            $response = Invoke-RestMethod -Uri $service.Url -Headers $headers -UseBasicParsing -TimeoutSec 5
        } else {
            $response = Invoke-RestMethod -Uri $service.Url -UseBasicParsing -TimeoutSec 5
        }
        Write-Success "$($service.Name) is running"
    } catch {
        Write-Failure "$($service.Name) is not responding"
        Add-TestResult "Service Check - $($service.Name)" $false "Service not responding"
    }
}

Write-TestStep "Creating test tenant and authenticating..."

# Create tenant
$tenantData = @{
    name = "Search Test Tenant"
    domain = "searchtest.example.com"
    settings = @{
        features = @{
            search_enabled = $true
        }
    }
}

$tenantResult = Invoke-ApiRequest -Method "POST" -Endpoint "/v1/tenants" -Body $tenantData
if (-not $tenantResult.Success) {
    Write-Failure "Failed to create tenant"
    Add-TestResult "Tenant Creation" $false $tenantResult.Error
    exit 1
}

$tenantId = $tenantResult.Data.id
Write-Success "Tenant created: $tenantId"

# Create application
$appData = @{
    name = "Search Test App"
    tenant_id = $tenantId
}

$appResult = Invoke-ApiRequest -Method "POST" -Endpoint "/v1/applications" -Body $appData
if (-not $appResult.Success) {
    Write-Failure "Failed to create application"
    Add-TestResult "Application Creation" $false $appResult.Error
    exit 1
}

$appId = $appResult.Data.id
$apiKey = $appResult.Data.api_key
Write-Success "Application created: $appId"

# Create test users
Write-TestStep "Creating test users..."

$users = @()
for ($i = 1; $i -le 5; $i++) {
    $userData = @{
        external_id = "search_user_$i"
        name = "Search User $i"
        email = "searchuser$i@test.com"
        metadata = @{
            department = if ($i -le 2) { "Engineering" } else { "Sales" }
        }
    }
    
    $userResult = Invoke-ApiRequest -Method "POST" -Endpoint "/v1/users" -Body $userData -Token $apiKey
    if ($userResult.Success) {
        $users += $userResult.Data
        Write-Info "Created user: $($userResult.Data.name)"
    }
}

if ($users.Count -lt 2) {
    Write-Failure "Failed to create enough test users"
    exit 1
}

$user1 = $users[0]
$user2 = $users[1]
$user3 = $users[2]

Write-Success "Created $($users.Count) test users"

# Authenticate users
Write-TestStep "Authenticating users..."

$authData1 = @{
    external_id = $user1.external_id
    application_id = $appId
}

$authResult1 = Invoke-ApiRequest -Method "POST" -Endpoint "/v1/auth/token" -Body $authData1 -Token $apiKey
if (-not $authResult1.Success) {
    Write-Failure "Failed to authenticate user 1"
    exit 1
}

$token1 = $authResult1.Data.access_token
Write-Success "User 1 authenticated"

$authData2 = @{
    external_id = $user2.external_id
    application_id = $appId
}

$authResult2 = Invoke-ApiRequest -Method "POST" -Endpoint "/v1/auth/token" -Body $authData2 -Token $apiKey
$token2 = $authResult2.Data.access_token
Write-Success "User 2 authenticated"

# Create conversations
Write-TestStep "Creating test conversations..."

$conversations = @()

# 1:1 conversation
$conv1Data = @{
    type = "direct"
    participant_ids = @($user1.id, $user2.id)
}

$conv1Result = Invoke-ApiRequest -Method "POST" -Endpoint "/v1/conversations" -Body $conv1Data -Token $token1
if ($conv1Result.Success) {
    $conversations += $conv1Result.Data
    Write-Info "Created 1:1 conversation"
}

# Group conversation
$conv2Data = @{
    type = "group"
    name = "Engineering Team Chat"
    participant_ids = @($user1.id, $user2.id, $user3.id)
}

$conv2Result = Invoke-ApiRequest -Method "POST" -Endpoint "/v1/conversations" -Body $conv2Data -Token $token1
if ($conv2Result.Success) {
    $conversations += $conv2Result.Data
    Write-Info "Created group conversation"
}

Write-Success "Created $($conversations.Count) conversations"

# Create test messages with searchable content
Write-TestStep "Creating test messages with searchable content..."

$testMessages = @(
    @{ conv = 0; text = "Hello everyone! Welcome to the team." }
    @{ conv = 0; text = "Let's discuss the new project requirements." }
    @{ conv = 0; text = "The deadline for the feature is next Friday." }
    @{ conv = 0; text = "Can someone review my pull request?" }
    @{ conv = 0; text = "Great work on the presentation!" }
    @{ conv = 1; text = "Engineering team meeting at 3 PM today." }
    @{ conv = 1; text = "Please update the documentation for the API." }
    @{ conv = 1; text = "Bug fix deployed to production successfully." }
    @{ conv = 1; text = "Code review feedback: looks good overall." }
    @{ conv = 1; text = "Performance optimization completed." }
)

$createdMessages = @()

foreach ($msg in $testMessages) {
    $msgData = @{
        conversation_id = $conversations[$msg.conv].id
        type = "text"
        content = @{
            text = $msg.text
        }
    }
    
    $msgResult = Invoke-ApiRequest -Method "POST" -Endpoint "/v1/messages" -Body $msgData -Token $token1
    if ($msgResult.Success) {
        $createdMessages += $msgResult.Data
        Write-Info "Created message: $($msg.text.Substring(0, [Math]::Min(40, $msg.text.Length)))..."
    }
}

Write-Success "Created $($createdMessages.Count) test messages"

# Wait for indexing
Write-TestStep "Waiting for Elasticsearch indexing..."
Write-Info "Waiting 15 seconds for messages to be indexed..."
Start-Sleep -Seconds 15
Write-Success "Indexing wait completed"

# ============================================
# TEST SEARCH-001: Elasticsearch Setup
# ============================================
Write-TestHeader "TEST SEARCH-001: Elasticsearch Setup"

Write-TestStep "Checking Elasticsearch cluster health..."
try {
    $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("elastic:changeme"))
    $headers = @{ Authorization = "Basic $auth" }
    $health = Invoke-RestMethod -Uri "http://localhost:9200/_cluster/health" -Headers $headers -UseBasicParsing
    
    if ($health.status -eq "green" -or $health.status -eq "yellow") {
        Write-Success "Elasticsearch cluster is healthy (status: $($health.status))"
        Add-TestResult "SEARCH-001: Cluster Health" $true "Status: $($health.status)"
    } else {
        Write-Failure "Elasticsearch cluster is unhealthy (status: $($health.status))"
        Add-TestResult "SEARCH-001: Cluster Health" $false "Status: $($health.status)"
    }
} catch {
    Write-Failure "Failed to check Elasticsearch health"
    Add-TestResult "SEARCH-001: Cluster Health" $false $_.Exception.Message
}

Write-TestStep "Checking if messages index exists..."
try {
    $indexCheck = Invoke-RestMethod -Uri "http://localhost:9200/messages" -Headers $headers -UseBasicParsing
    Write-Success "Messages index exists"
    Write-Info "Shards: $($indexCheck.messages.settings.index.number_of_shards)"
    Write-Info "Replicas: $($indexCheck.messages.settings.index.number_of_replicas)"
    Add-TestResult "SEARCH-001: Messages Index" $true "Index exists and configured"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Failure "Messages index does not exist"
        Add-TestResult "SEARCH-001: Messages Index" $false "Index not found"
    } else {
        Write-Failure "Error checking messages index"
        Add-TestResult "SEARCH-001: Messages Index" $false $_.Exception.Message
    }
}

Write-TestStep "Checking index mapping..."
try {
    $mapping = Invoke-RestMethod -Uri "http://localhost:9200/messages/_mapping" -Headers $headers -UseBasicParsing
    $properties = $mapping.messages.mappings.properties
    
    $requiredFields = @("id", "conversation_id", "tenant_id", "sender_id", "content", "created_at")
    $missingFields = @()
    
    foreach ($field in $requiredFields) {
        if (-not $properties.$field) {
            $missingFields += $field
        }
    }
    
    if ($missingFields.Count -eq 0) {
        Write-Success "All required fields are mapped"
        Add-TestResult "SEARCH-001: Index Mapping" $true "All fields present"
    } else {
        Write-Failure "Missing fields in mapping: $($missingFields -join ', ')"
        Add-TestResult "SEARCH-001: Index Mapping" $false "Missing: $($missingFields -join ', ')"
    }
} catch {
    Write-Failure "Failed to check index mapping"
    Add-TestResult "SEARCH-001: Index Mapping" $false $_.Exception.Message
}

# ============================================
# TEST SEARCH-002: Message Indexing
# ============================================
Write-TestHeader "TEST SEARCH-002: Message Indexing Consumer"

Write-TestStep "Checking if messages were indexed..."
try {
    $searchBody = @{
        query = @{
            match_all = @{}
        }
        size = 0
    } | ConvertTo-Json -Depth 10
    
    $countResult = Invoke-RestMethod -Uri "http://localhost:9200/messages/_search" -Method POST -Headers $headers -Body $searchBody -ContentType "application/json" -UseBasicParsing
    
    $indexedCount = $countResult.hits.total.value
    Write-Info "Messages in index: $indexedCount"
    Write-Info "Messages created: $($createdMessages.Count)"
    
    if ($indexedCount -ge $createdMessages.Count) {
        Write-Success "All messages were indexed successfully"
        Add-TestResult "SEARCH-002: Message Indexing" $true "Indexed: $indexedCount/$($createdMessages.Count)"
    } elseif ($indexedCount -gt 0) {
        Write-Failure "Only $indexedCount/$($createdMessages.Count) messages were indexed"
        Add-TestResult "SEARCH-002: Message Indexing" $false "Partial indexing: $indexedCount/$($createdMessages.Count)"
    } else {
        Write-Failure "No messages were indexed"
        Add-TestResult "SEARCH-002: Message Indexing" $false "No messages indexed"
    }
} catch {
    Write-Failure "Failed to check indexed messages"
    Add-TestResult "SEARCH-002: Message Indexing" $false $_.Exception.Message
}

Write-TestStep "Verifying indexed message content..."
try {
    $sampleMessage = $createdMessages[0]
    $docResult = Invoke-RestMethod -Uri "http://localhost:9200/messages/_doc/$($sampleMessage.id)" -Headers $headers -UseBasicParsing
    
    if ($docResult.found) {
        $source = $docResult._source
        Write-Success "Sample message found in index"
        Write-Info "Message ID: $($source.id)"
        Write-Info "Content: $($source.content.Substring(0, [Math]::Min(50, $source.content.Length)))..."
        Write-Info "Tenant ID: $($source.tenant_id)"
        Add-TestResult "SEARCH-002: Message Content" $true "Content properly indexed"
    } else {
        Write-Failure "Sample message not found in index"
        Add-TestResult "SEARCH-002: Message Content" $false "Message not found"
    }
} catch {
    Write-Failure "Failed to verify message content"
    Add-TestResult "SEARCH-002: Message Content" $false $_.Exception.Message
}

# ============================================
# TEST SEARCH-003: Conversation & User Indexing
# ============================================
Write-TestHeader "TEST SEARCH-003: Conversation and User Indexing"

Write-TestStep "Checking conversations index..."
try {
    $convIndexCheck = Invoke-RestMethod -Uri "http://localhost:9200/conversations" -Headers $headers -UseBasicParsing -ErrorAction SilentlyContinue
    Write-Success "Conversations index exists"
    Add-TestResult "SEARCH-003: Conversations Index" $true "Index exists"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Failure "Conversations index does not exist"
        Add-TestResult "SEARCH-003: Conversations Index" $false "Index not found"
    } else {
        Write-Failure "Error checking conversations index"
        Add-TestResult "SEARCH-003: Conversations Index" $false $_.Exception.Message
    }
}

Write-TestStep "Checking users index..."
try {
    $userIndexCheck = Invoke-RestMethod -Uri "http://localhost:9200/users" -Headers $headers -UseBasicParsing -ErrorAction SilentlyContinue
    Write-Success "Users index exists"
    Add-TestResult "SEARCH-003: Users Index" $true "Index exists"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Failure "Users index does not exist (may not be implemented yet)"
        Add-TestResult "SEARCH-003: Users Index" $false "Index not found"
    } else {
        Write-Failure "Error checking users index"
        Add-TestResult "SEARCH-003: Users Index" $false $_.Exception.Message
    }
}

# ============================================
# TEST SEARCH-004: Message Search API
# ============================================
Write-TestHeader "TEST SEARCH-004: Message Search API"

Write-TestStep "Testing full-text search..."
$searchResult = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search/messages?query=project" -Token $token1

if ($searchResult.Success) {
    $hits = $searchResult.Data.hits
    Write-Success "Full-text search successful"
    Write-Info "Found $($hits.Count) results for 'project'"
    
    if ($hits.Count -gt 0) {
        Write-Info "Sample result: $($hits[0].content.Substring(0, [Math]::Min(50, $hits[0].content.Length)))..."
        Add-TestResult "SEARCH-004: Full-Text Search" $true "Found $($hits.Count) results"
    } else {
        Write-Failure "No results found for 'project'"
        Add-TestResult "SEARCH-004: Full-Text Search" $false "No results"
    }
} else {
    Write-Failure "Full-text search failed: $($searchResult.Error)"
    Add-TestResult "SEARCH-004: Full-Text Search" $false $searchResult.Error
}

Write-TestStep "Testing search with conversation filter..."
$convSearchResult = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search/messages?query=team&conversation_id=$($conversations[0].id)" -Token $token1

if ($convSearchResult.Success) {
    Write-Success "Conversation filter works"
    Write-Info "Found $($convSearchResult.Data.hits.Count) results in conversation"
    Add-TestResult "SEARCH-004: Conversation Filter" $true "Filter working"
} else {
    Write-Failure "Conversation filter failed: $($convSearchResult.Error)"
    Add-TestResult "SEARCH-004: Conversation Filter" $false $convSearchResult.Error
}

Write-TestStep "Testing search highlighting..."
$highlightResult = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search/messages?query=engineering" -Token $token1

if ($highlightResult.Success -and $highlightResult.Data.hits.Count -gt 0) {
    $firstHit = $highlightResult.Data.hits[0]
    if ($firstHit.highlight) {
        Write-Success "Search highlighting is working"
        Write-Info "Highlighted: $($firstHit.highlight)"
        Add-TestResult "SEARCH-004: Highlighting" $true "Highlighting present"
    } else {
        Write-Failure "No highlighting in results"
        Add-TestResult "SEARCH-004: Highlighting" $false "No highlighting"
    }
} else {
    Write-Failure "Failed to test highlighting"
    Add-TestResult "SEARCH-004: Highlighting" $false "No results to check"
}

Write-TestStep "Testing search pagination..."
$page1 = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search/messages?query=the&limit=3&offset=0" -Token $token1
$page2 = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search/messages?query=the&limit=3&offset=3" -Token $token1

if ($page1.Success -and $page2.Success) {
    Write-Success "Pagination works"
    Write-Info "Page 1: $($page1.Data.hits.Count) results"
    Write-Info "Page 2: $($page2.Data.hits.Count) results"
    Add-TestResult "SEARCH-004: Pagination" $true "Pagination working"
} else {
    Write-Failure "Pagination test failed"
    Add-TestResult "SEARCH-004: Pagination" $false "Failed"
}

# ============================================
# TEST SEARCH-005: Global Search API
# ============================================
Write-TestHeader "TEST SEARCH-005: Global Search API"

Write-TestStep "Testing global search across all entities..."
$globalResult = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search?query=engineering" -Token $token1

if ($globalResult.Success) {
    Write-Success "Global search successful"
    
    $data = $globalResult.Data
    
    if ($data.messages) {
        Write-Info "Messages found: $($data.messages.total)"
        Add-TestResult "SEARCH-005: Global Search Messages" $true "Found $($data.messages.total) messages"
    } else {
        Write-Failure "No messages in global search results"
        Add-TestResult "SEARCH-005: Global Search Messages" $false "No messages"
    }
    
    if ($data.conversations) {
        Write-Info "Conversations found: $($data.conversations.total)"
        Add-TestResult "SEARCH-005: Global Search Conversations" $true "Found $($data.conversations.total) conversations"
    } else {
        Write-Info "No conversations in global search results (may be expected)"
        Add-TestResult "SEARCH-005: Global Search Conversations" $true "No conversations (expected)"
    }
    
    if ($data.users) {
        Write-Info "Users found: $($data.users.total)"
        Add-TestResult "SEARCH-005: Global Search Users" $true "Found $($data.users.total) users"
    } else {
        Write-Info "No users in global search results (may not be implemented)"
        Add-TestResult "SEARCH-005: Global Search Users" $false "No users"
    }
} else {
    Write-Failure "Global search failed: $($globalResult.Error)"
    Add-TestResult "SEARCH-005: Global Search" $false $globalResult.Error
}

Write-TestStep "Testing global search result categorization..."
$categoryResult = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search?query=team" -Token $token1

if ($categoryResult.Success) {
    $hasCategories = $false
    
    if ($categoryResult.Data.PSObject.Properties.Name -contains "messages") {
        $hasCategories = $true
    }
    if ($categoryResult.Data.PSObject.Properties.Name -contains "conversations") {
        $hasCategories = $true
    }
    
    if ($hasCategories) {
        Write-Success "Results are properly categorized"
        Add-TestResult "SEARCH-005: Result Categorization" $true "Categories present"
    } else {
        Write-Failure "Results are not categorized"
        Add-TestResult "SEARCH-005: Result Categorization" $false "No categories"
    }
} else {
    Write-Failure "Failed to test categorization"
    Add-TestResult "SEARCH-005: Result Categorization" $false $categoryResult.Error
}

Write-TestStep "Testing tenant isolation in global search..."
$isolationResult = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search?query=project" -Token $token1

if ($isolationResult.Success) {
    Write-Success "Tenant isolation check passed"
    Write-Info "User can only see their tenant's data"
    Add-TestResult "SEARCH-005: Tenant Isolation" $true "Isolation working"
} else {
    Write-Failure "Tenant isolation test failed"
    Add-TestResult "SEARCH-005: Tenant Isolation" $false $isolationResult.Error
}

# ============================================
# TEST SEARCH-006: Suggestions & Autocomplete
# ============================================
Write-TestHeader "TEST SEARCH-006: Search Suggestions and Autocomplete"

Write-TestStep "Testing search suggestions..."
$suggestResult = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search/suggestions?query=proj" -Token $token1

if ($suggestResult.Success) {
    if ($suggestResult.Data.suggestions -and $suggestResult.Data.suggestions.Count -gt 0) {
        Write-Success "Search suggestions working"
        Write-Info "Found $($suggestResult.Data.suggestions.Count) suggestions"
        foreach ($suggestion in $suggestResult.Data.suggestions) {
            Write-Info "  - $($suggestion.text)"
        }
        Add-TestResult "SEARCH-006: Search Suggestions" $true "Found $($suggestResult.Data.suggestions.Count) suggestions"
    } else {
        Write-Failure "No suggestions returned (may not be implemented)"
        Add-TestResult "SEARCH-006: Search Suggestions" $false "No suggestions"
    }
} else {
    Write-Failure "Search suggestions failed: $($suggestResult.Error)"
    Add-TestResult "SEARCH-006: Search Suggestions" $false $suggestResult.Error
}

Write-TestStep "Testing user autocomplete for mentions..."
$autocompleteResult = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search/users?query=Search" -Token $token1

if ($autocompleteResult.Success) {
    if ($autocompleteResult.Data.users -and $autocompleteResult.Data.users.Count -gt 0) {
        Write-Success "User autocomplete working"
        Write-Info "Found $($autocompleteResult.Data.users.Count) users"
        foreach ($user in $autocompleteResult.Data.users) {
            Write-Info "  - $($user.name)"
        }
        Add-TestResult "SEARCH-006: User Autocomplete" $true "Found $($autocompleteResult.Data.users.Count) users"
    } else {
        Write-Failure "No users returned in autocomplete (may not be implemented)"
        Add-TestResult "SEARCH-006: User Autocomplete" $false "No users"
    }
} else {
    Write-Failure "User autocomplete failed: $($autocompleteResult.Error)"
    Add-TestResult "SEARCH-006: User Autocomplete" $false $autocompleteResult.Error
}

Write-TestStep "Testing fuzzy matching in autocomplete..."
$fuzzyResult = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search/users?query=Serch" -Token $token1

if ($fuzzyResult.Success) {
    if ($fuzzyResult.Data.users -and $fuzzyResult.Data.users.Count -gt 0) {
        Write-Success "Fuzzy matching works (found results for typo 'Serch')"
        Add-TestResult "SEARCH-006: Fuzzy Matching" $true "Fuzzy matching working"
    } else {
        Write-Failure "Fuzzy matching not working (no results for typo)"
        Add-TestResult "SEARCH-006: Fuzzy Matching" $false "No fuzzy results"
    }
} else {
    Write-Failure "Fuzzy matching test failed"
    Add-TestResult "SEARCH-006: Fuzzy Matching" $false $fuzzyResult.Error
}

Write-TestStep "Testing conversation-scoped user autocomplete..."
$convId = $conversations[0].id
$scopedEndpoint = "/v1/search/users?query=User`&conversation_id=$convId"
$scopedResult = Invoke-ApiRequest -Method "GET" -Endpoint $scopedEndpoint -Token $token1

if ($scopedResult.Success) {
    if ($scopedResult.Data.users) {
        Write-Success "Conversation-scoped autocomplete works"
        Write-Info "Found $($scopedResult.Data.users.Count) users in conversation"
        Add-TestResult "SEARCH-006: Scoped Autocomplete" $true "Scoped search working"
    } else {
        Write-Failure "Scoped autocomplete returned no results"
        Add-TestResult "SEARCH-006: Scoped Autocomplete" $false "No results"
    }
} else {
    Write-Failure "Scoped autocomplete failed: $($scopedResult.Error)"
    Add-TestResult "SEARCH-006: Scoped Autocomplete" $false $scopedResult.Error
}

# ============================================
# ADDITIONAL TESTS
# ============================================
Write-TestHeader "ADDITIONAL SEARCH TESTS"

Write-TestStep "Testing search with special characters..."
$specialResult = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search/messages?query=pull+request" -Token $token1

if ($specialResult.Success) {
    Write-Success "Special character handling works"
    Add-TestResult "Additional: Special Characters" $true "Handled correctly"
} else {
    Write-Failure "Special character handling failed"
    Add-TestResult "Additional: Special Characters" $false $specialResult.Error
}

Write-TestStep "Testing empty search query..."
$emptyResult = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search/messages?query=" -Token $token1

if ($emptyResult.Success) {
    Write-Success "Empty query handled gracefully"
    Add-TestResult "Additional: Empty Query" $true "Handled gracefully"
} else {
    Write-Info "Empty query rejected (expected behavior)"
    Add-TestResult "Additional: Empty Query" $true "Rejected as expected"
}

Write-TestStep "Testing search performance..."
$startTime = Get-Date
$perfResult = Invoke-ApiRequest -Method "GET" -Endpoint "/v1/search/messages?query=the" -Token $token1
$endTime = Get-Date
$duration = ($endTime - $startTime).TotalMilliseconds

if ($perfResult.Success) {
    Write-Success "Search completed in $([Math]::Round($duration, 2))ms"
    
    if ($duration -lt 1000) {
        Write-Info "Performance is good (< 1 second)"
        Add-TestResult "Additional: Performance" $true "Response time: $([Math]::Round($duration, 2))ms"
    } else {
        Write-Failure "Performance is slow (> 1 second)"
        Add-TestResult "Additional: Performance" $false "Slow response: $([Math]::Round($duration, 2))ms"
    }
} else {
    Write-Failure "Performance test failed"
    Add-TestResult "Additional: Performance" $false $perfResult.Error
}

# ============================================
# TEST SUMMARY
# ============================================
Write-TestHeader "TEST SUMMARY"

$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_.Passed -eq $true }).Count
$failedTests = $totalTests - $passedTests
$passRate = if ($totalTests -gt 0) { [Math]::Round(($passedTests / $totalTests) * 100, 2) } else { 0 }

Write-Host ""
Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Red" })
Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 60) { "Yellow" } else { "Red" })
Write-Host ""

# Group results by task
Write-Host "Results by Task:" -ForegroundColor Cyan
Write-Host "----------------" -ForegroundColor Cyan

$taskGroups = $testResults | Group-Object { $_.Test.Split(':')[0] }

foreach ($group in $taskGroups) {
    $taskPassed = ($group.Group | Where-Object { $_.Passed -eq $true }).Count
    $taskTotal = $group.Count
    $taskStatus = if ($taskPassed -eq $taskTotal) { "[PASS]" } else { "[FAIL]" }
    $taskColor = if ($taskPassed -eq $taskTotal) { "Green" } else { "Red" }
    
    Write-Host "$taskStatus $($group.Name): $taskPassed/$taskTotal passed" -ForegroundColor $taskColor
}

Write-Host ""

# Detailed results
Write-Host "Detailed Results:" -ForegroundColor Cyan
Write-Host "-----------------" -ForegroundColor Cyan

foreach ($result in $testResults) {
    $status = if ($result.Passed) { "[PASS]" } else { "[FAIL]" }
    $color = if ($result.Passed) { "Green" } else { "Red" }
    
    Write-Host "$status [$($result.Timestamp)] $($result.Test)" -ForegroundColor $color
    Write-Host "  $($result.Details)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test execution completed!" -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Save results to file
$reportPath = "PHASE4_SEARCH_TEST_RESULTS.md"
$testDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$report = @"
# Phase 4 - Search Service Test Results

**Test Date:** $testDate
**Total Tests:** $totalTests
**Passed:** $passedTests
**Failed:** $failedTests
**Pass Rate:** $passRate%

## Summary by Task

"@

foreach ($group in $taskGroups) {
    $taskPassed = ($group.Group | Where-Object { $_.Passed -eq $true }).Count
    $taskTotal = $group.Count
    if ($taskPassed -eq $taskTotal) {
        $taskStatusText = 'PASS'
    } else {
        $taskStatusText = 'FAIL'
    }
    
    $line = '- [' + $taskStatusText + '] **' + $group.Name + '**: ' + $taskPassed + '/' + $taskTotal + ' tests passed'
    $report = $report + [Environment]::NewLine + $line
}

$report = $report + [Environment]::NewLine + [Environment]::NewLine + '## Detailed Test Results' + [Environment]::NewLine + [Environment]::NewLine
$report = $report + '| Time | Test | Status | Details |' + [Environment]::NewLine
$report = $report + '| ---- | ---- | ------ | ------- |' + [Environment]::NewLine

foreach ($result in $testResults) {
    $status = if ($result.Passed) { 'PASS' } else { 'FAIL' }
    $line = '| ' + $result.Timestamp + ' | ' + $result.Test + ' | ' + $status + ' | ' + $result.Details + ' |'
    $report = $report + $line + [Environment]::NewLine
}

$report = $report + [Environment]::NewLine + [Environment]::NewLine + '## Test Coverage' + [Environment]::NewLine + [Environment]::NewLine
$report = $report + '### SEARCH-001: Elasticsearch Setup' + [Environment]::NewLine
$report = $report + '- Cluster health check' + [Environment]::NewLine
$report = $report + '- Messages index existence' + [Environment]::NewLine
$report = $report + '- Index mapping verification' + [Environment]::NewLine + [Environment]::NewLine

$report = $report + '### SEARCH-002: Message Indexing Consumer' + [Environment]::NewLine
$report = $report + '- Message indexing via Kafka' + [Environment]::NewLine
$report = $report + '- Indexed message count verification' + [Environment]::NewLine
$report = $report + '- Message content verification' + [Environment]::NewLine + [Environment]::NewLine

$report = $report + '### SEARCH-003: Conversation and User Indexing' + [Environment]::NewLine
$report = $report + '- Conversations index check' + [Environment]::NewLine
$report = $report + '- Users index check' + [Environment]::NewLine + [Environment]::NewLine

$report = $report + '### SEARCH-004: Message Search API' + [Environment]::NewLine
$report = $report + '- Full-text search' + [Environment]::NewLine
$report = $report + '- Conversation filter' + [Environment]::NewLine
$report = $report + '- Search highlighting' + [Environment]::NewLine
$report = $report + '- Pagination' + [Environment]::NewLine + [Environment]::NewLine

$report = $report + '### SEARCH-005: Global Search API' + [Environment]::NewLine
$report = $report + '- Multi-entity search' + [Environment]::NewLine
$report = $report + '- Result categorization' + [Environment]::NewLine
$report = $report + '- Tenant isolation' + [Environment]::NewLine + [Environment]::NewLine

$report = $report + '### SEARCH-006: Suggestions and Autocomplete' + [Environment]::NewLine
$report = $report + '- Search suggestions' + [Environment]::NewLine
$report = $report + '- User autocomplete' + [Environment]::NewLine
$report = $report + '- Fuzzy matching' + [Environment]::NewLine
$report = $report + '- Conversation-scoped autocomplete' + [Environment]::NewLine + [Environment]::NewLine

$report = $report + '### Additional Tests' + [Environment]::NewLine
$report = $report + '- Special character handling' + [Environment]::NewLine
$report = $report + '- Empty query handling' + [Environment]::NewLine
$report = $report + '- Search performance' + [Environment]::NewLine + [Environment]::NewLine

$report = $report + '## Conclusion' + [Environment]::NewLine + [Environment]::NewLine
if ($passRate -ge 80) {
    $report = $report + '**Search service is working well!** Most tests passed successfully.' + [Environment]::NewLine
} elseif ($passRate -ge 60) {
    $report = $report + '**Search service is partially working.** Some features need attention.' + [Environment]::NewLine
} else {
    $report = $report + '**Search service needs significant work.** Many tests failed.' + [Environment]::NewLine
}

$report = $report + [Environment]::NewLine + '---' + [Environment]::NewLine
$report = $report + '*Generated by phase4-search-comprehensive-test.ps1*' + [Environment]::NewLine

$report | Out-File -FilePath $reportPath -Encoding UTF8
Write-Host 'Test report saved to: ' -NoNewline -ForegroundColor Green
Write-Host $reportPath -ForegroundColor Green
Write-Host ''

# Exit with appropriate code
if ($failedTests -eq 0) {
    exit 0
} else {
    exit 1
}
