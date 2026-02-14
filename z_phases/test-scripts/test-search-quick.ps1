# Quick Search Service Test

Write-Host "Testing Search Service..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check Elasticsearch
Write-Host "1. Checking Elasticsearch..." -ForegroundColor Yellow
try {
    $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("elastic:changeme"))
    $headers = @{ Authorization = "Basic $auth" }
    $health = Invoke-RestMethod -Uri "http://localhost:9200/_cluster/health" -Headers $headers -UseBasicParsing
    Write-Host "   Elasticsearch Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   Elasticsearch Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Check Search Service
Write-Host "2. Checking Search Service..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3006/health" -UseBasicParsing
    Write-Host "   Search Service Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   Search Service Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Check Elasticsearch Indices
Write-Host "3. Checking Elasticsearch Indices..." -ForegroundColor Yellow
try {
    $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("elastic:changeme"))
    $headers = @{ Authorization = "Basic $auth" }
    $indices = Invoke-RestMethod -Uri "http://localhost:9200/_cat/indices?format=json" -Headers $headers -UseBasicParsing
    $searchIndices = $indices | Where-Object { $_.index -in @('messages', 'conversations', 'users') }
    foreach ($index in $searchIndices) {
        Write-Host "   Index: $($index.index) - Docs: $($index.'docs.count')" -ForegroundColor Green
    }
} catch {
    Write-Host "   Indices Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Check Kafka Topics
Write-Host "4. Checking Kafka Topics..." -ForegroundColor Yellow
try {
    $topics = docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --list 2>&1 | Out-String
    if ($topics -match "messages") {
        Write-Host "   Topic 'messages' exists" -ForegroundColor Green
    }
    if ($topics -match "conversations") {
        Write-Host "   Topic 'conversations' exists" -ForegroundColor Green
    }
    if ($topics -match "users") {
        Write-Host "   Topic 'users' exists" -ForegroundColor Green
    }
} catch {
    Write-Host "   Kafka Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Search Service is ready for testing!" -ForegroundColor Green
Write-Host ""
