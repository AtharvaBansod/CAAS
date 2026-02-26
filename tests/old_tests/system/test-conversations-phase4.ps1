# Test Phase 4 Conversation Features (Pin, Archive, Delete)
# Requires CAAS services to be running

$GatewayUrl = "http://localhost:3000"
$JwtSecret = "change_this_in_production_please"

function New-JwtToken {
    param (
        [string]$UserId,
        [string]$TenantId,
        [string]$Email
    )
    
    $header = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes('{"alg":"HS256","typ":"JWT"}')).TrimEnd('=')
    $payloadJson = '{"sub":"' + $UserId + '","tenant_id":"' + $TenantId + '","email":"' + $Email + '","iat":' + [int][double]::Parse((Get-Date -UFormat %s)) + '}'
    $payload = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($payloadJson)).TrimEnd('=')
    
    $signatureInput = "$header.$payload"
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($JwtSecret)
    $signatureBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($signatureInput))
    $signature = [Convert]::ToBase64String($signatureBytes).Replace('+', '-').Replace('/', '_').TrimEnd('=')
    
    return "$header.$payload.$signature"
}

# Generate Token
$Token = New-JwtToken -UserId "user-123" -TenantId "tenant-1" -Email "test@example.com"
$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

Write-Host "Generated Test Token: $Token" -ForegroundColor DarkGray
Write-Host ""

# 1. Create a Conversation
Write-Host "1. Creating Conversation..." -ForegroundColor Yellow
$CreateBody = @{
    type = "group"
    participant_ids = @("user-123", "user-456")
    name = "Test Group Phase 4"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$GatewayUrl/v1/conversations" -Method Post -Headers $Headers -Body $CreateBody
    $ConvId = $response._id
    Write-Host "   Conversation Created: $ConvId" -ForegroundColor Green
} catch {
    Write-Host "   Failed to create conversation: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Pin Conversation
Write-Host "2. Pinning Conversation..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$GatewayUrl/v1/conversations/$ConvId/pin" -Method Post -Headers $Headers
    Write-Host "   Pinned successfully" -ForegroundColor Green
} catch {
    Write-Host "   Failed to pin: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Check Pinned
Write-Host "3. Checking Pinned Conversations..." -ForegroundColor Yellow
try {
    $pinned = Invoke-RestMethod -Uri "$GatewayUrl/v1/conversations/pinned-conversations" -Method Get -Headers $Headers
    if ($pinned.Count -gt 0 -and $pinned[0].conversation_id -eq $ConvId) {
        Write-Host "   Verified: Conversation is pinned" -ForegroundColor Green
    } else {
        Write-Host "   Failed: Conversation not found in pinned list" -ForegroundColor Red
    }
} catch {
    Write-Host "   Failed to get pinned: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Unpin Conversation
Write-Host "4. Unpinning Conversation..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$GatewayUrl/v1/conversations/$ConvId/pin" -Method Delete -Headers $Headers
    Write-Host "   Unpinned successfully" -ForegroundColor Green
} catch {
    Write-Host "   Failed to unpin: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Archive Conversation
Write-Host "5. Archiving Conversation..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$GatewayUrl/v1/conversations/$ConvId/archive" -Method Post -Headers $Headers
    Write-Host "   Archived successfully" -ForegroundColor Green
} catch {
    Write-Host "   Failed to archive: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Check Archived
Write-Host "6. Checking Archived Conversations..." -ForegroundColor Yellow
try {
    $archived = Invoke-RestMethod -Uri "$GatewayUrl/v1/conversations/archived" -Method Get -Headers $Headers
    if ($archived.Count -gt 0 -and $archived[0].conversation_id -eq $ConvId) {
        Write-Host "   Verified: Conversation is archived" -ForegroundColor Green
    } else {
        Write-Host "   Failed: Conversation not found in archived list" -ForegroundColor Red
    }
} catch {
    Write-Host "   Failed to get archived: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Unarchive Conversation
Write-Host "7. Unarchiving Conversation..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$GatewayUrl/v1/conversations/$ConvId/archive" -Method Delete -Headers $Headers
    Write-Host "   Unarchived successfully" -ForegroundColor Green
} catch {
    Write-Host "   Failed to unarchive: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Soft Delete Conversation
Write-Host "8. Deleting Conversation (Soft)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$GatewayUrl/v1/conversations/$ConvId" -Method Delete -Headers $Headers
    Write-Host "   Deleted successfully" -ForegroundColor Green
} catch {
    Write-Host "   Failed to delete: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. Get Deleted Conversations
Write-Host "9. Checking Deleted Conversations..." -ForegroundColor Yellow
try {
    $deleted = Invoke-RestMethod -Uri "$GatewayUrl/v1/conversations/deleted-conversations" -Method Get -Headers $Headers
    if ($deleted.Count -gt 0 -and $deleted[0].conversation_id -eq $ConvId) {
        Write-Host "   Verified: Conversation is in deleted list" -ForegroundColor Green
    } else {
        Write-Host "   Failed: Conversation not found in deleted list" -ForegroundColor Red
    }
} catch {
    Write-Host "   Failed to get deleted: $($_.Exception.Message)" -ForegroundColor Red
}

# 10. Restore Conversation
Write-Host "10. Restoring Conversation..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$GatewayUrl/v1/conversations/$ConvId/restore" -Method Post -Headers $Headers
    Write-Host "   Restored successfully" -ForegroundColor Green
} catch {
    Write-Host "   Failed to restore: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Phase 4 Conversation Tests Completed" -ForegroundColor Cyan
