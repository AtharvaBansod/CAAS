# Phase 4 Messages Test Script
# Tests MSG-001 to MSG-012

param(
    [string]$GatewayUrl = "http://localhost:3000"
)

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Phase 4 Messages Test Suite" -ForegroundColor Cyan
Write-Host "  Testing MSG-001 to MSG-012" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$results = @{
    passed = 0
    failed = 0
    skipped = 0
}

$testConversationId = $null
$testMessageId = $null

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
            ErrorAction = "Stop"
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "  Success: $Name passed" -ForegroundColor Green
        $script:results.passed++
        return $response
    }
    catch {
        Write-Host "  Failed: $Name - $($_.Exception.Message)" -ForegroundColor Red
        $script:results.failed++
        return $null
    }
}

# Test 1: Health Check
Write-Host "`n=== Testing Gateway Health ===" -ForegroundColor Cyan
Test-Endpoint -Name "Gateway Health" -Method "GET" -Url "$GatewayUrl/health"

# Test 2: Create Conversation (prerequisite)
Write-Host "`n=== Creating Test Conversation ===" -ForegroundColor Cyan
$conversation = Test-Endpoint -Name "Create Conversation" -Method "POST" -Url "$GatewayUrl/v1/conversations" -Body @{
    type = "direct"
    participant_ids = @("user1", "user2")
    name = "Test Conversation"
}

if ($conversation) {
    $testConversationId = $conversation._id
    Write-Host "  Conversation ID: $testConversationId" -ForegroundColor Gray
}

# Test 3: Send Message (MSG-001 to MSG-004)
Write-Host "`n=== Testing Send Message (MSG-001 to MSG-004) ===" -ForegroundColor Cyan
if ($testConversationId) {
    $message = Test-Endpoint -Name "Send Text Message" -Method "POST" -Url "$GatewayUrl/v1/messages" -Body @{
        conversation_id = $testConversationId
        type = "text"
        content = @{
            text = "Hello, this is a test message with @user2 mention"
        }
    }
    
    if ($message) {
        $testMessageId = $message.id
        Write-Host "  Message ID: $testMessageId" -ForegroundColor Gray
    }
} else {
    Write-Host "  Skipped (no conversation)" -ForegroundColor Yellow
    $script:results.skipped++
}

# Test 4: Get Messages
Write-Host "`n=== Testing Get Messages ===" -ForegroundColor Cyan
if ($testConversationId) {
    Test-Endpoint -Name "Get Messages" -Method "GET" -Url "$GatewayUrl/v1/messages/conversations/$testConversationId"
} else {
    Write-Host "  Skipped (no conversation)" -ForegroundColor Yellow
    $script:results.skipped++
}

# Test 5: Text Processing (MSG-005)
Write-Host "`n=== Testing Text Processing (MSG-005) ===" -ForegroundColor Cyan
if ($testConversationId) {
    Test-Endpoint -Name "Send Markdown Message" -Method "POST" -Url "$GatewayUrl/v1/messages" -Body @{
        conversation_id = $testConversationId
        type = "text"
        content = @{
            text = "Bold and italic with code and @mention #hashtag"
        }
    }
} else {
    Write-Host "  Skipped (no conversation)" -ForegroundColor Yellow
    $script:results.skipped++
}

# Test 6: Reactions (MSG-009)
Write-Host "`n=== Testing Reactions (MSG-009) ===" -ForegroundColor Cyan
if ($testMessageId) {
    Test-Endpoint -Name "Add Reaction" -Method "POST" -Url "$GatewayUrl/v1/messages/$testMessageId/reactions" -Body @{ emoji = "thumbsup" }
    Test-Endpoint -Name "Get Reactions" -Method "GET" -Url "$GatewayUrl/v1/messages/$testMessageId/reactions"
    Test-Endpoint -Name "Remove Reaction" -Method "DELETE" -Url "$GatewayUrl/v1/messages/$testMessageId/reactions"
} else {
    Write-Host "  Skipped (no message)" -ForegroundColor Yellow
    $script:results.skipped += 3
}

# Test 7: Replies (MSG-010)
Write-Host "`n=== Testing Replies (MSG-010) ===" -ForegroundColor Cyan
if ($testMessageId) {
    Test-Endpoint -Name "Create Reply" -Method "POST" -Url "$GatewayUrl/v1/messages/$testMessageId/replies" -Body @{ content = "This is a reply" }
    Test-Endpoint -Name "Get Thread Replies" -Method "GET" -Url "$GatewayUrl/v1/messages/$testMessageId/replies"
} else {
    Write-Host "  Skipped (no message)" -ForegroundColor Yellow
    $script:results.skipped += 2
}

# Test 8: Forward (MSG-011)
Write-Host "`n=== Testing Forward (MSG-011) ===" -ForegroundColor Cyan
if ($testMessageId -and $testConversationId) {
    Test-Endpoint -Name "Forward Message" -Method "POST" -Url "$GatewayUrl/v1/messages/$testMessageId/forward" -Body @{ conversation_ids = @($testConversationId) }
} else {
    Write-Host "  Skipped (no message)" -ForegroundColor Yellow
    $script:results.skipped++
}

# Test 9: Edit Message (MSG-012)
Write-Host "`n=== Testing Edit Message (MSG-012) ===" -ForegroundColor Cyan
if ($testMessageId) {
    Test-Endpoint -Name "Edit Message" -Method "PUT" -Url "$GatewayUrl/v1/messages/$testMessageId" -Body @{ content = "This is an edited message" }
    Test-Endpoint -Name "Get Edit History" -Method "GET" -Url "$GatewayUrl/v1/messages/$testMessageId/history"
} else {
    Write-Host "  Skipped (no message)" -ForegroundColor Yellow
    $script:results.skipped += 2
}

# Test 10: Delete Message
Write-Host "`n=== Testing Delete Message ===" -ForegroundColor Cyan
if ($testMessageId) {
    Test-Endpoint -Name "Delete Message" -Method "DELETE" -Url "$GatewayUrl/v1/messages/$testMessageId"
} else {
    Write-Host "  Skipped (no message)" -ForegroundColor Yellow
    $script:results.skipped++
}

# Summary
Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Passed:  $($results.passed)" -ForegroundColor Green
Write-Host "Failed:  $($results.failed)" -ForegroundColor Red
Write-Host "Skipped: $($results.skipped)" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan

if ($results.failed -gt 0) {
    exit 1
}
