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

# Ensure JWT keys exist (gateway and socket need RS256 keys)
$keysDir = ".\keys"
if (-not (Test-Path $keysDir)) {
    New-Item -ItemType Directory -Path $keysDir -Force | Out-Null
}
$privPath = Join-Path $keysDir "private.pem"
$pubPath = Join-Path $keysDir "public.pem"
if (-not (Test-Path $privPath)) {
    Write-Host "Generating JWT keys for development..." -ForegroundColor Yellow
    $generated = $false

    # Prefer local node if available
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        node .\scripts\generate-jwt-keys.js 2>&1 | Out-Null
        if (Test-Path $privPath) {
            $generated = $true
        }
    }

    # Fallback: generate keys using Dockerized node runtime (docker-only friendly)
    if (-not $generated) {
        Write-Host "  Local Node not available, generating keys via Docker..." -ForegroundColor Gray
        docker run --rm -v "${PWD}:/work" -w /work node:20-alpine node ./scripts/generate-jwt-keys.js 2>&1 | Out-Null
        if (Test-Path $privPath) {
            $generated = $true
        }
    }

    if (Test-Path $privPath) {
        Write-Host "  JWT keys generated in $keysDir" -ForegroundColor Green
    } else {
        Write-Host "  Warning: Could not generate keys. Set JWT_PRIVATE_KEY and JWT_PUBLIC_KEY in .env manually." -ForegroundColor Yellow
    }
}
# Load JWT keys into env for docker-compose (gateway/socket need these)
if ((Test-Path $privPath) -and (Test-Path $pubPath)) {
    $env:JWT_PRIVATE_KEY = Get-Content $privPath -Raw
    $env:JWT_PUBLIC_KEY = Get-Content $pubPath -Raw
}

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
    docker compose up -d `
        mongodb-primary `
        mongodb-secondary-1 `
        mongodb-secondary-2 `
        redis-gateway `
        redis-socket `
        redis-shared `
        redis-compliance `
        redis-crypto `
        zookeeper 2>&1 | Out-Null
    
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
        # Wait for replica set to stabilize before writes
        Write-Host "  Waiting for replica set to stabilize (15s)..." -ForegroundColor Gray
        Start-Sleep -Seconds 15
    } else {
        Write-Host "  Replica set already initialized" -ForegroundColor Green
    }
    
    # Initialize Database (User & Collections)
    Write-Host "  Initializing database (users & collections)..." -ForegroundColor Gray
    
    $initResult = Get-Content .\services\mongodb-service\init-db.js -Raw | docker exec -i caas-mongodb-primary mongosh "mongodb://caas_admin:caas_secret_2026@mongodb-primary:27017/?authSource=admin&replicaSet=caas-rs" 2>&1 | Out-String
    
    if ($initResult -match "Error" -and $initResult -notmatch "already exists") {
        Write-Host "  Warning during DB initialization: $initResult" -ForegroundColor Yellow
    } else {
        Write-Host "  Database initialized" -ForegroundColor Green
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
    
    # Create Kafka topics using service script
    Write-Host "  Creating Kafka topics..." -ForegroundColor Gray
    
    # Copy script to container and run
    docker cp .\services\kafka-service\create-topics.sh caas-kafka-1:/tmp/create-topics.sh 2>&1 | Out-Null
    $kafkaResult = docker exec caas-kafka-1 bash /tmp/create-topics.sh 2>&1 | Out-String
    
    if ($kafkaResult -match "Error" -and $kafkaResult -notmatch "already exists") {
        Write-Host "  Warning during Kafka initialization: $kafkaResult" -ForegroundColor Yellow
    } else {
        Write-Host "  Kafka topics initialized" -ForegroundColor Green
    }
    
    Write-Host ""
    
    # Start Elasticsearch
    Write-Host "  Starting Elasticsearch..." -ForegroundColor Gray
    docker compose up -d elasticsearch 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to start Elasticsearch!" -ForegroundColor Red
        exit 1
    }
    
    # Wait for Elasticsearch to be healthy
    Write-Host "  Waiting for Elasticsearch to be healthy..." -ForegroundColor Gray
    $maxWait = 120
    $waited = 0
    while ($waited -lt $maxWait) {
        $status = docker inspect caas-elasticsearch --format='{{.State.Health.Status}}' 2>&1
        if ($status -eq "healthy") {
            Write-Host "  Elasticsearch is healthy" -ForegroundColor Green
            break
        }
        if ($waited % 10 -eq 0 -and $waited -gt 0) {
            Write-Host "    Still waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
        }
        Start-Sleep -Seconds 5
        $waited += 5
    }
    
    if ($waited -ge $maxWait) {
        Write-Host "  Warning: Elasticsearch health check timeout" -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    # Start MinIO
    Write-Host "  Starting MinIO..." -ForegroundColor Gray
    docker compose up -d minio 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to start MinIO!" -ForegroundColor Red
        exit 1
    }
    
    # Wait for MinIO to be healthy
    Write-Host "  Waiting for MinIO to be healthy..." -ForegroundColor Gray
    $maxWait = 60
    $waited = 0
    while ($waited -lt $maxWait) {
        $status = docker inspect caas-minio --format='{{.State.Health.Status}}' 2>&1
        if ($status -eq "healthy") {
            Write-Host "  MinIO is healthy" -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 3
        $waited += 3
    }
    
    # Initialize MinIO bucket (minio/minio image does not have mc - use minio/mc container)
    Write-Host "  Creating MinIO bucket..." -ForegroundColor Gray
    
    $minioUser = if ($env:MINIO_ROOT_USER) { $env:MINIO_ROOT_USER } else { "minioadmin" }
    $minioPass = if ($env:MINIO_ROOT_PASSWORD) { $env:MINIO_ROOT_PASSWORD } else { "minioadmin" }
    $mcHost = "http://${minioUser}:${minioPass}@minio:9000"
    $minioResult = docker run --rm --network caas_caas-network -e "MC_HOST_myminio=$mcHost" minio/mc mb myminio/caas-media --ignore-existing 2>&1 | Out-String
    
    if ($minioResult -match "Error" -and $minioResult -notmatch "already exists" -and $minioResult -notmatch "BucketAlreadyExists") {
        Write-Host "  Warning during MinIO initialization: $minioResult" -ForegroundColor Yellow
    } else {
        Write-Host "  MinIO bucket initialized" -ForegroundColor Green
    }
    
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
    
    # Wait for Search Service
    Write-Host "Waiting for Search Service to be healthy..." -ForegroundColor Yellow
    $maxWait = 60
    $waited = 0
    while ($waited -lt $maxWait) {
        try {
            $health = Invoke-WebRequest -Uri "http://localhost:3006/health" -UseBasicParsing -TimeoutSec 2 2>&1
            if ($health.StatusCode -eq 200) {
                Write-Host "Search Service is healthy!" -ForegroundColor Green
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
        Write-Host "Warning: Search Service health check timeout" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Service Status:" -ForegroundColor Cyan
    Write-Host "---------------" -ForegroundColor Cyan
    docker compose ps
    
    Write-Host ""
    
    # Check Socket Services
    Write-Host "Checking Socket Services..." -ForegroundColor Yellow
    $socket1Health = $false
    $socket2Health = $false
    
    try {
        $health1 = Invoke-WebRequest -Uri "http://localhost:3002/health" -UseBasicParsing -TimeoutSec 2 2>&1
        if ($health1.StatusCode -eq 200) {
            $socket1Health = $true
            Write-Host "  Socket Service 1: Healthy" -ForegroundColor Green
        }
    } catch {
        Write-Host "  Socket Service 1: Not responding" -ForegroundColor Yellow
    }
    
    try {
        $health2 = Invoke-WebRequest -Uri "http://localhost:3003/health" -UseBasicParsing -TimeoutSec 2 2>&1
        if ($health2.StatusCode -eq 200) {
            $socket2Health = $true
            Write-Host "  Socket Service 2: Healthy" -ForegroundColor Green
        }
    } catch {
        Write-Host "  Socket Service 2: Not responding" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "CAAS Platform Started!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Access Points:" -ForegroundColor Yellow
    Write-Host "  Gateway API:        http://localhost:3000" -ForegroundColor White
    Write-Host "  Gateway Health:     http://localhost:3000/health" -ForegroundColor White
    Write-Host "  Gateway Docs:       http://localhost:3000/documentation" -ForegroundColor White
    Write-Host "  Auth Service:       http://localhost:3007/health" -ForegroundColor White
    Write-Host "  Compliance Service: http://localhost:3008/health" -ForegroundColor White
    Write-Host "  Crypto Service:     http://localhost:3009/health" -ForegroundColor White
    Write-Host "  Search Service:     http://localhost:3006/health" -ForegroundColor White
    Write-Host "  Socket Service 1:   http://localhost:3002/health" -ForegroundColor White
    Write-Host "  Socket Service 2:   http://localhost:3003/health" -ForegroundColor White
    Write-Host "  Elasticsearch:      http://localhost:9200" -ForegroundColor White
    Write-Host "  MinIO Console:      http://localhost:9001" -ForegroundColor White
    Write-Host "  Kafka UI:           http://localhost:8080" -ForegroundColor White
    Write-Host "  Mongo Express:      http://localhost:8082" -ForegroundColor White
    Write-Host "  Redis Commander:    http://localhost:8083" -ForegroundColor White
    Write-Host ""
    Write-Host "Run './tests/phase4.5.0-complete-test.ps1' to test Phase 4.5.0" -ForegroundColor Yellow
    Write-Host "Run './tests/phase4.5.1-compliance-test.ps1' to test Phase 4.5.1" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    Write-Host "Error starting services: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Checking logs..." -ForegroundColor Yellow
    docker compose logs --tail=50
    exit 1
}
