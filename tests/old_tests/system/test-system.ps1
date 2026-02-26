# CAAS Platform System Test Script
# ============================================

Write-Host "🧪 Testing CAAS Platform..." -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# Test MongoDB
Write-Host "Testing MongoDB..." -ForegroundColor Yellow
try {
    $mongoTest = docker compose exec -T mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --quiet --eval "db.adminCommand('ping').ok"
    if ($mongoTest -match "1") {
        Write-Host "✅ MongoDB: PASS" -ForegroundColor Green
    } else {
        Write-Host "❌ MongoDB: FAIL" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "❌ MongoDB: FAIL - $_" -ForegroundColor Red
    $allPassed = $false
}

# Test MongoDB Replica Set
Write-Host "Testing MongoDB Replica Set..." -ForegroundColor Yellow
try {
    $rsTest = docker compose exec -T mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --quiet --eval "rs.status().ok"
    if ($rsTest -match "1") {
        Write-Host "✅ MongoDB Replica Set: PASS" -ForegroundColor Green
    } else {
        Write-Host "❌ MongoDB Replica Set: FAIL" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "❌ MongoDB Replica Set: FAIL - $_" -ForegroundColor Red
    $allPassed = $false
}

# Test Redis
Write-Host "Testing Redis..." -ForegroundColor Yellow
try {
    $redisTest = docker compose exec -T redis redis-cli -a caas_redis_2026 ping 2>$null
    if ($redisTest -match "PONG") {
        Write-Host "✅ Redis: PASS" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis: FAIL" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "❌ Redis: FAIL - $_" -ForegroundColor Red
    $allPassed = $false
}

# Test Kafka
Write-Host "Testing Kafka..." -ForegroundColor Yellow
try {
    $kafkaTest = docker compose exec -T kafka-1 kafka-broker-api-versions --bootstrap-server localhost:9092 2>&1
    if ($kafkaTest -match "ApiVersion") {
        Write-Host "✅ Kafka: PASS" -ForegroundColor Green
    } else {
        Write-Host "❌ Kafka: FAIL" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "❌ Kafka: FAIL - $_" -ForegroundColor Red
    $allPassed = $false
}

# Test Kafka Topics
Write-Host "Testing Kafka Topics..." -ForegroundColor Yellow
try {
    $topicsTest = docker compose exec -T kafka-1 kafka-topics --bootstrap-server localhost:9092 --list 2>&1
    if ($topicsTest -match "platform.events") {
        Write-Host "✅ Kafka Topics: PASS" -ForegroundColor Green
    } else {
        Write-Host "❌ Kafka Topics: FAIL" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "❌ Kafka Topics: FAIL - $_" -ForegroundColor Red
    $allPassed = $false
}

# Test Schema Registry
Write-Host "Testing Schema Registry..." -ForegroundColor Yellow
try {
    $schemaTest = Invoke-WebRequest -Uri "http://localhost:8081/" -UseBasicParsing -TimeoutSec 5
    if ($schemaTest.StatusCode -eq 200) {
        Write-Host "✅ Schema Registry: PASS" -ForegroundColor Green
    } else {
        Write-Host "❌ Schema Registry: FAIL" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "❌ Schema Registry: FAIL - $_" -ForegroundColor Red
    $allPassed = $false
}

# Test Gateway
Write-Host "Testing API Gateway..." -ForegroundColor Yellow
try {
    $gatewayTest = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    if ($gatewayTest.StatusCode -eq 200) {
        Write-Host "✅ API Gateway: PASS" -ForegroundColor Green
    } else {
        Write-Host "❌ API Gateway: FAIL" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "❌ API Gateway: FAIL - $_" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

if ($allPassed) {
    Write-Host "✅ ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Phase 1 infrastructure is fully operational!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📍 Access Points:" -ForegroundColor Cyan
    Write-Host "   API Gateway:      http://localhost:3000" -ForegroundColor White
    Write-Host "   API Docs:         http://localhost:3000/docs" -ForegroundColor White
    Write-Host "   Kafka UI:         http://localhost:8080" -ForegroundColor White
    Write-Host "   MongoDB Express:  http://localhost:8082" -ForegroundColor White
    Write-Host "   Redis Commander:  http://localhost:8083" -ForegroundColor White
    exit 0
} else {
    Write-Host "❌ SOME TESTS FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check service logs: docker compose logs [service]" -ForegroundColor White
    Write-Host "   2. Restart services: docker compose restart" -ForegroundColor White
    Write-Host "   3. Check service status: docker compose ps" -ForegroundColor White
    exit 1
}
