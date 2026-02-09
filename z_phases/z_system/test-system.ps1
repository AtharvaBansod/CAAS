# Phase 1 & Phase 2 System Test Script
Write-Host "CAAS Platform - System Tests" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0

function Test-Service {
    param([string]$Name, [scriptblock]$Test)
    Write-Host "Testing $Name..." -NoNewline
    try {
        if (& $Test) {
            Write-Host " PASS" -ForegroundColor Green
            $script:passed++
        } else {
            Write-Host " FAIL" -ForegroundColor Red
            $script:failed++
        }
    } catch {
        Write-Host " FAIL - $($_.Exception.Message)" -ForegroundColor Red
        $script:failed++
    }
}

Write-Host "Phase 1: Infrastructure" -ForegroundColor Yellow
Write-Host ""

Test-Service "MongoDB Primary" {
    $result = docker exec caas-mongodb-primary mongosh --quiet --eval "db.version()" 2>&1
    return $result -match "7.0"
}

Test-Service "MongoDB Replica Set" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --quiet --eval "JSON.stringify(rs.status())" 2>&1
    return $result -match "PRIMARY"
}

Test-Service "Redis" {
    $result = docker exec caas-redis redis-cli -a caas_redis_2026 ping 2>&1
    return $result -match "PONG"
}

Test-Service "Zookeeper" {
    $result = docker exec caas-zookeeper bash -c "echo srvr | nc localhost 2181" 2>&1
    return $result -match "Mode"
}

Test-Service "Kafka Broker" {
    $result = docker exec caas-kafka-1 kafka-broker-api-versions --bootstrap-server localhost:9092 2>&1
    return $result -match "ApiVersion"
}

Test-Service "Kafka Topics" {
    $result = docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --list 2>&1
    return $result -match "platform.events"
}

Test-Service "Gateway Health" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Write-Host ""
Write-Host "Phase 2: Security" -ForegroundColor Yellow
Write-Host ""

Test-Service "Gateway MongoDB Connection" {
    $logs = docker logs caas-gateway 2>&1 | Select-String -Pattern "MongoDB.*connected" -CaseSensitive:$false
    return $logs.Count -gt 0
}

Test-Service "Gateway Redis Connection" {
    $logs = docker logs caas-gateway 2>&1 | Select-String -Pattern "Redis.*connected" -CaseSensitive:$false
    return $logs.Count -gt 0
}

Test-Service "Webhook Consumer" {
    $logs = docker logs caas-gateway 2>&1 | Select-String "Webhook consumer started"
    return $logs.Count -gt 0
}

Write-Host ""
Write-Host "Management UIs" -ForegroundColor Yellow
Write-Host ""

Test-Service "Kafka UI" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Test-Service "Mongo Express" {
    try {
        $cred = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin123"))
        $response = Invoke-WebRequest -Uri "http://localhost:8082" -UseBasicParsing -Headers @{Authorization="Basic $cred"} -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Test-Service "Redis Commander" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8083" -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Write-Host ""
Write-Host "=============================" -ForegroundColor Cyan
$total = $passed + $failed
$percentage = [math]::Round(($passed / $total) * 100, 1)
Write-Host "Results: $passed/$total passed ($percentage%)" -ForegroundColor $(if ($percentage -ge 80) { "Green" } else { "Yellow" })
Write-Host ""
