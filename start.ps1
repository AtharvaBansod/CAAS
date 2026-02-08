# CAAS Platform - Start Script
# Starts all services with proper initialization

param(
    [switch]$Clean,
    [switch]$Build
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CAAS Platform - Starting Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Docker is not running!" -ForegroundColor Red
        Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "Error: Docker is not installed or not accessible!" -ForegroundColor Red
    exit 1
}

# Clean volumes if requested
if ($Clean) {
    Write-Host "Cleaning up existing volumes..." -ForegroundColor Yellow
    docker compose down -v --remove-orphans 2>&1 | Out-Null
    Write-Host "Volumes cleaned!" -ForegroundColor Green
    Write-Host ""
}

# Build if requested
if ($Build) {
    Write-Host "Building services..." -ForegroundColor Yellow
    docker compose build --no-cache
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Build complete!" -ForegroundColor Green
    Write-Host ""
}

# Start services
Write-Host "Starting services..." -ForegroundColor Yellow
Write-Host ""

try {
    # Start infrastructure services first
    Write-Host "  Starting infrastructure services..." -ForegroundColor Gray
    docker compose up -d mongodb-primary mongodb-secondary-1 mongodb-secondary-2 redis zookeeper 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to start infrastructure services!" -ForegroundColor Red
        exit 1
    }
    
    # Wait for MongoDB to be healthy
    Write-Host "  Waiting for MongoDB to be healthy..." -ForegroundColor Gray
    $maxWait = 60
    $waited = 0
    while ($waited -lt $maxWait) {
        $status = docker inspect caas-mongodb-primary --format='{{.State.Health.Status}}' 2>&1
        if ($status -eq "healthy") {
            Write-Host "  MongoDB is healthy" -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 2
        $waited += 2
    }
    
    if ($waited -ge $maxWait) {
        Write-Host "  Warning: MongoDB health check timeout" -ForegroundColor Yellow
    }
    
    # Initialize MongoDB Replica Set
    Write-Host "  Initializing MongoDB replica set..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    
    $rsStatus = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --quiet --eval "rs.status().ok" 2>&1 | Out-String
    
    if ($rsStatus -notmatch "1" -or $rsStatus -match "no replset config") {
        Write-Host "  Initializing replica set..." -ForegroundColor Gray
        docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --eval "rs.initiate({ _id: 'caas-rs', members: [ { _id: 0, host: 'mongodb-primary:27017', priority: 2 }, { _id: 1, host: 'mongodb-secondary-1:27017', priority: 1 }, { _id: 2, host: 'mongodb-secondary-2:27017', priority: 1 } ] })" 2>&1 | Out-Null
        
        # Wait for PRIMARY election
        Write-Host "  Waiting for PRIMARY election..." -ForegroundColor Gray
        $maxWait = 30
        $waited = 0
        while ($waited -lt $maxWait) {
            $state = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --quiet --eval "rs.status().myState" 2>&1 | Out-String
            if ($state -match "1") {
                Write-Host "  PRIMARY elected" -ForegroundColor Green
                break
            }
            Start-Sleep -Seconds 2
            $waited += 2
        }
    } else {
        Write-Host "  Replica set already initialized" -ForegroundColor Green
    }
    
    # Create Phase 2 Collections
    Write-Host "  Creating Phase 2 collections..." -ForegroundColor Gray
    $collections = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --quiet --eval "db.getCollectionNames().length" 2>&1 | Out-String
    
    if ($collections -match "^[0-9]+$" -and [int]$collections -ge 28) {
        Write-Host "  Collections already exist" -ForegroundColor Green
    } else {
        Get-Content init-phase2-collections.js | docker exec -i caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin 2>&1 | Out-Null
        Write-Host "  Collections created" -ForegroundColor Green
    }
    
    Write-Host ""
    
    # Start Kafka cluster
    Write-Host "  Starting Kafka cluster..." -ForegroundColor Gray
    docker compose up -d kafka-1 kafka-2 kafka-3 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to start Kafka cluster!" -ForegroundColor Red
        exit 1
    }
    
    # Wait for Kafka to be healthy
    Write-Host "  Waiting for Kafka to be healthy..." -ForegroundColor Gray
    $maxWait = 60
    $waited = 0
    while ($waited -lt $maxWait) {
        $status = docker inspect caas-kafka-1 --format='{{.State.Health.Status}}' 2>&1
        if ($status -eq "healthy") {
            Write-Host "  Kafka is healthy" -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 3
        $waited += 3
    }
    
    Write-Host ""
    
    # Start schema registry
    Write-Host "  Starting Schema Registry..." -ForegroundColor Gray
    docker compose up -d schema-registry 2>&1 | Out-Null
    
    # Wait for schema registry
    $maxWait = 60
    $waited = 0
    while ($waited -lt $maxWait) {
        $status = docker inspect caas-schema-registry --format='{{.State.Health.Status}}' 2>&1
        if ($status -eq "healthy") {
            Write-Host "  Schema Registry is healthy" -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 3
        $waited += 3
    }
    
    # Create Kafka topics directly
    Write-Host "  Creating Kafka topics..." -ForegroundColor Gray
    
    # Create topics one by one with proper config
    docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --create --if-not-exists --topic platform.events --partitions 3 --replication-factor 3 --config retention.ms=604800000 --config compression.type=snappy 2>&1 | Out-Null
    docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --create --if-not-exists --topic platform.audit --partitions 3 --replication-factor 3 --config retention.ms=2592000000 --config compression.type=snappy 2>&1 | Out-Null
    docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --create --if-not-exists --topic platform.notifications --partitions 3 --replication-factor 3 --config retention.ms=604800000 2>&1 | Out-Null
    docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --create --if-not-exists --topic internal.dlq --partitions 3 --replication-factor 3 --config retention.ms=2592000000 2>&1 | Out-Null
    docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --create --if-not-exists --topic internal.retry --partitions 3 --replication-factor 3 --config retention.ms=604800000 2>&1 | Out-Null
    docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --create --if-not-exists --topic auth.revocation.events --partitions 3 --replication-factor 3 --config retention.ms=2592000000 2>&1 | Out-Null
    docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --create --if-not-exists --topic events --partitions 3 --replication-factor 3 --config retention.ms=604800000 2>&1 | Out-Null
    
    Write-Host "  Kafka topics created" -ForegroundColor Green
    
    Write-Host ""
    
    # Start remaining services
    Write-Host "  Starting remaining services..." -ForegroundColor Gray
    docker compose up -d 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to start services!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "Services started successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Wait for Gateway to be healthy
    Write-Host "Waiting for Gateway to be healthy..." -ForegroundColor Yellow
    $maxWait = 90
    $waited = 0
    while ($waited -lt $maxWait) {
        try {
            $health = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 2 2>&1
            if ($health.StatusCode -eq 200) {
                Write-Host "Gateway is healthy!" -ForegroundColor Green
                break
            }
        } catch {}
        
        if ($waited % 10 -eq 0) {
            Write-Host "  Still waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
        }
        
        Start-Sleep -Seconds 3
        $waited += 3
    }
    
    if ($waited -ge $maxWait) {
        Write-Host "Warning: Gateway health check timeout" -ForegroundColor Yellow
        Write-Host "Gateway may still be starting up..." -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    # Check service status
    Write-Host "Service Status:" -ForegroundColor Cyan
    Write-Host "---------------" -ForegroundColor Cyan
    docker compose ps
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "CAAS Platform Started!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Access Points:" -ForegroundColor Yellow
    Write-Host "  Gateway API:        http://localhost:3000" -ForegroundColor White
    Write-Host "  Gateway Health:     http://localhost:3000/health" -ForegroundColor White
    Write-Host "  Gateway Docs:       http://localhost:3000/documentation" -ForegroundColor White
    Write-Host "  Kafka UI:           http://localhost:8080" -ForegroundColor White
    Write-Host "  Mongo Express:      http://localhost:8082" -ForegroundColor White
    Write-Host "  Redis Commander:    http://localhost:8083" -ForegroundColor White
    Write-Host ""
    Write-Host "Run './test-system.ps1' to verify all services" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    Write-Host "Error starting services: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Checking logs..." -ForegroundColor Yellow
    docker compose logs --tail=50
    exit 1
}
