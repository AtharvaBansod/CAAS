# CAAS Platform - System Initialization Script
# NOTE: This script may be redundant as all initialization is now handled by start.ps1
# This script can be used for manual re-initialization if needed
# Ensures MongoDB replica set and collections are properly initialized

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CAAS Platform - System Initialization" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if MongoDB is ready
function Test-MongoDBReady {
    try {
        $result = docker exec caas-mongodb-primary mongosh --quiet --eval "db.version()" 2>&1
        return $result -match "7.0"
    } catch {
        return $false
    }
}

# Function to check if replica set is initialized
function Test-ReplicaSetInitialized {
    try {
        $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --quiet --eval "rs.status().ok" 2>&1 | Out-String
        # Check if result contains error messages
        if ($result -match "no replset config" -or $result -match "MongoServerError") {
            return $false
        }
        return $result -match "1"
    } catch {
        return $false
    }
}

# Function to check if replica set has PRIMARY
function Test-ReplicaSetPrimary {
    try {
        $state = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --quiet --eval "rs.status().myState" 2>&1 | Out-String
        return $state -match "1"
    } catch {
        return $false
    }
}

# Step 1: Wait for MongoDB Primary to be healthy
Write-Host "Step 1: Waiting for MongoDB Primary..." -ForegroundColor Yellow
$maxTries = 30
$tries = 0
while ($tries -lt $maxTries) {
    if (Test-MongoDBReady) {
        Write-Host "OK MongoDB Primary is ready" -ForegroundColor Green
        break
    }
    $tries++
    if ($tries -ge $maxTries) {
        Write-Host "X MongoDB Primary failed to start" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Waiting... (attempt $tries/$maxTries)" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

Write-Host ""

# Step 2: Initialize Replica Set
Write-Host "Step 2: Initializing Replica Set..." -ForegroundColor Yellow
if (Test-ReplicaSetInitialized) {
    Write-Host "OK Replica set already initialized" -ForegroundColor Green
} else {
    Write-Host "  Initializing replica set..." -ForegroundColor Gray
    try {
        # Use authentication to initialize
        $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --eval "rs.initiate({ _id: 'caas-rs', members: [ { _id: 0, host: 'mongodb-primary:27017', priority: 2 }, { _id: 1, host: 'mongodb-secondary-1:27017', priority: 1 }, { _id: 2, host: 'mongodb-secondary-2:27017', priority: 1 } ] })" 2>&1 | Out-String
        if ($result -match "ok.*1" -or $result -match "already initialized") {
            Write-Host "OK Replica set initialized" -ForegroundColor Green
        } else {
            throw "Initialization failed: $result"
        }
    } catch {
        Write-Host "X Failed to initialize replica set" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Step 3: Wait for PRIMARY to be elected
Write-Host "Step 3: Waiting for PRIMARY election..." -ForegroundColor Yellow
$maxTries = 30
$tries = 0
while ($tries -lt $maxTries) {
    if (Test-ReplicaSetPrimary) {
        Write-Host "OK PRIMARY elected" -ForegroundColor Green
        break
    }
    $tries++
    if ($tries -ge $maxTries) {
        Write-Host "X PRIMARY not elected" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Waiting... (attempt $tries/$maxTries)" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

Write-Host ""

# Step 4: Create Phase 2 Collections
Write-Host "Step 4: Creating Phase 2 Collections..." -ForegroundColor Yellow
try {
    $collections = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --quiet --eval "db.getCollectionNames().length" 2>&1 | Out-String
    if ($collections -match "2[89]|[3-9][0-9]") {
        Write-Host "OK Collections already exist ($($collections.Trim()) collections)" -ForegroundColor Green
    } else {
        Write-Host "  Creating collections..." -ForegroundColor Gray
        Get-Content init-phase2-collections.js | docker exec -i caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin 2>&1 | Out-Null
        Write-Host "OK Collections created" -ForegroundColor Green
    }
} catch {
    Write-Host "  Creating collections..." -ForegroundColor Gray
    Get-Content init-phase2-collections.js | docker exec -i caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin 2>&1 | Out-Null
    Write-Host "OK Collections created" -ForegroundColor Green
}

Write-Host ""

# Step 5: Verify Kafka Topics (they should be created by kafka-init container)
Write-Host "Step 5: Verifying Kafka Topics..." -ForegroundColor Yellow
$maxTries = 30
$tries = 0
while ($tries -lt $maxTries) {
    try {
        $topics = docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --list 2>&1 | Out-String
        if ($topics -match "platform.events" -and $topics -match "platform.audit") {
            Write-Host "OK Kafka topics verified" -ForegroundColor Green
            break
        }
    } catch {}
    $tries++
    if ($tries -ge $maxTries) {
        Write-Host "! Kafka topics not found (may need manual creation)" -ForegroundColor Yellow
        break
    }
    Write-Host "  Waiting for topics... (attempt $tries/$maxTries)" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

Write-Host ""

# Step 6: Wait for Gateway to be healthy
Write-Host "Step 6: Waiting for Gateway to be healthy..." -ForegroundColor Yellow
$maxTries = 30
$tries = 0
while ($tries -lt $maxTries) {
    try {
        $health = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 2 2>&1
        if ($health.StatusCode -eq 200) {
            Write-Host "OK Gateway is healthy" -ForegroundColor Green
            break
        }
    } catch {}
    $tries++
    if ($tries -ge $maxTries) {
        Write-Host "! Gateway not healthy yet (may still be starting)" -ForegroundColor Yellow
        break
    }
    Write-Host "  Waiting... (attempt $tries/$maxTries)" -ForegroundColor Gray
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "System Initialization Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run './test-system.ps1' to verify the system" -ForegroundColor Yellow
Write-Host ""
