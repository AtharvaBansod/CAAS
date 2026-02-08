# CAAS Platform - System Initialization Script
# Ensures MongoDB replica set and collections are properly initialized

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CAAS Platform - System Initialization" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Wait for MongoDB Primary to be healthy
Write-Host "Step 1: Waiting for MongoDB Primary..." -ForegroundColor Yellow
$maxTries = 30
$tries = 0
while ($tries -lt $maxTries) {
    try {
        $result = docker exec caas-mongodb-primary mongosh --quiet --eval "db.version()" 2>&1
        if ($result -match "7.0") {
            Write-Host "OK MongoDB Primary is ready" -ForegroundColor Green
            break
        }
    } catch {}
    $tries++
    Write-Host "  Waiting... (attempt $tries/$maxTries)" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

if ($tries -ge $maxTries) {
    Write-Host "X MongoDB Primary failed to start" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Initialize Replica Set
Write-Host "Step 2: Initializing Replica Set..." -ForegroundColor Yellow
try {
    $status = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --quiet --eval "rs.status().ok" 2>&1 | Out-String
    if ($status -match "1") {
        Write-Host "OK Replica set already initialized" -ForegroundColor Green
    } else {
        throw "Not initialized"
    }
} catch {
    Write-Host "  Initializing replica set..." -ForegroundColor Gray
    docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --eval "rs.initiate({ _id: 'caas-rs', members: [ { _id: 0, host: 'mongodb-primary:27017', priority: 2 }, { _id: 1, host: 'mongodb-secondary-1:27017', priority: 1 }, { _id: 2, host: 'mongodb-secondary-2:27017', priority: 1 } ] })" | Out-Null
    Write-Host "OK Replica set initialized" -ForegroundColor Green
}

Write-Host ""

# Step 3: Wait for PRIMARY to be elected
Write-Host "Step 3: Waiting for PRIMARY election..." -ForegroundColor Yellow
$maxTries = 30
$tries = 0
while ($tries -lt $maxTries) {
    try {
        $state = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --quiet --eval "rs.status().myState" 2>&1 | Out-String
        if ($state -match "1") {
            Write-Host "OK PRIMARY elected" -ForegroundColor Green
            break
        }
    } catch {}
    $tries++
    Write-Host "  Waiting... (attempt $tries/$maxTries)" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

if ($tries -ge $maxTries) {
    Write-Host "X PRIMARY not elected" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Create Phase 2 Collections
Write-Host "Step 4: Creating Phase 2 Collections..." -ForegroundColor Yellow
try {
    $collections = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --quiet --eval "db.getCollectionNames().length" 2>&1 | Out-String
    if ($collections -match "2[89]|3[0-9]") {
        Write-Host "OK Collections already exist" -ForegroundColor Green
    } else {
        throw "Need to create collections"
    }
} catch {
    Write-Host "  Creating collections..." -ForegroundColor Gray
    Get-Content init-phase2-collections.js | docker exec -i caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin 2>&1 | Out-Null
    Write-Host "OK Collections created" -ForegroundColor Green
}

Write-Host ""

# Step 5: Create Kafka Topics
Write-Host "Step 5: Creating Kafka Topics..." -ForegroundColor Yellow
$topics = @("platform.events", "platform.audit", "platform.notifications", "internal.dlq", "auth.revocation.events", "events")
foreach ($topic in $topics) {
    try {
        docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --create --if-not-exists --topic $topic --partitions 3 --replication-factor 3 2>&1 | Out-Null
    } catch {}
}
Write-Host "OK Kafka topics created" -ForegroundColor Green

Write-Host ""

# Step 6: Restart Gateway
Write-Host "Step 6: Restarting Gateway..." -ForegroundColor Yellow
docker compose restart gateway 2>&1 | Out-Null
Start-Sleep -Seconds 10
Write-Host "OK Gateway restarted" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "System Initialization Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run './test-system.ps1' to verify the system" -ForegroundColor Yellow
Write-Host ""
