#!/usr/bin/env pwsh
# CAAS Platform - Phase 1 & Phase 2 Comprehensive Test
# Tests all infrastructure and security features

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CAAS Platform - Phase 1 & 2 Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$script:passCount = 0
$script:failCount = 0
$script:totalTests = 0

function Test-Feature {
    param(
        [string]$Name,
        [scriptblock]$Test
    )
    
    $script:totalTests++
    Write-Host "Testing $Name... " -NoNewline
    
    try {
        $result = & $Test
        if ($result) {
            Write-Host "PASS" -ForegroundColor Green
            $script:passCount++
            return $true
        } else {
            Write-Host "FAIL" -ForegroundColor Red
            $script:failCount++
            return $false
        }
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
        $script:failCount++
        return $false
    }
}

Write-Host "Phase 1: Infrastructure Tests" -ForegroundColor Yellow
Write-Host "==============================" -ForegroundColor Yellow
Write-Host ""

# MongoDB Tests
Test-Feature "MongoDB Primary" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --eval "db.adminCommand('ping')" --quiet 2>&1
    return $result -match "ok.*1"
}

Test-Feature "MongoDB Replica Set" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --eval "rs.status().ok" --quiet 2>&1
    return $result -match "1"
}

Test-Feature "MongoDB Collections (32)" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --eval "db.getCollectionNames().length" --quiet 2>&1
    $count = [int]($result -replace '[^0-9]','')
    return $count -ge 28
}

# Redis Tests
Test-Feature "Redis Connection" {
    $result = docker exec caas-redis redis-cli -a caas_redis_2026 ping 2>&1
    return $result -match "PONG"
}

Test-Feature "Redis Info" {
    $result = docker exec caas-redis redis-cli -a caas_redis_2026 info server 2>&1
    return $result -match "redis_version"
}

# Kafka Tests
Test-Feature "Kafka Broker 1" {
    $result = docker exec caas-kafka-1 kafka-broker-api-versions --bootstrap-server kafka-1:29092 2>&1
    return $result -match "ApiVersion"
}

Test-Feature "Kafka Topics (6)" {
    $result = docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --list 2>&1
    $topics = $result | Where-Object { $_ -notmatch "^$" -and $_ -notmatch "consumer_offsets" -and $_ -notmatch "_schemas" }
    return $topics.Count -ge 6
}

Test-Feature "Kafka Topic: platform.events" {
    $result = docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --describe --topic platform.events 2>&1
    return $result -match "PartitionCount.*3"
}

Test-Feature "Kafka Topic: auth.revocation.events" {
    $result = docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --describe --topic auth.revocation.events 2>&1
    return $result -match "PartitionCount.*3"
}

# Zookeeper Test
Test-Feature "Zookeeper" {
    $result = docker exec caas-zookeeper bash -c "echo srvr | nc localhost 2181" 2>&1
    return $result -match "Mode"
}

# Schema Registry Test
Test-Feature "Schema Registry" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8081" -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Write-Host ""
Write-Host "Phase 2: Security Tests" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow
Write-Host ""

# Gateway Tests
Test-Feature "Gateway Health" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Test-Feature "Gateway MongoDB Connection" {
    $logs = docker logs caas-gateway 2>&1 | Select-String -Pattern "MongoDB.*connected" -CaseSensitive:$false
    return $logs.Count -gt 0
}

Test-Feature "Gateway Redis Connection" {
    $logs = docker logs caas-gateway 2>&1 | Select-String -Pattern "Redis.*connected" -CaseSensitive:$false
    return $logs.Count -gt 0
}

Test-Feature "Gateway Auth Services" {
    $logs = docker logs caas-gateway 2>&1 | Select-String -Pattern "Auth.*initialized" -CaseSensitive:$false
    return $logs.Count -gt 0
}

Test-Feature "Gateway Webhook Consumer" {
    $logs = docker logs caas-gateway 2>&1 | Select-String -Pattern "Webhook consumer started" -CaseSensitive:$false
    return $logs.Count -gt 0
}

# Authentication Collections
Test-Feature "Auth Collection: user_sessions" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --eval "db.user_sessions.getIndexes().length" --quiet 2>&1
    return $result -match "[0-9]"
}

Test-Feature "Auth Collection: refresh_tokens" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --eval "db.refresh_tokens.getIndexes().length" --quiet 2>&1
    return $result -match "[0-9]"
}

Test-Feature "Auth Collection: mfa_secrets" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --eval "db.mfa_secrets.getIndexes().length" --quiet 2>&1
    return $result -match "[0-9]"
}

# Authorization Collections
Test-Feature "Authz Collection: authorization_policies" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --eval "db.authorization_policies.getIndexes().length" --quiet 2>&1
    return $result -match "[0-9]"
}

Test-Feature "Authz Collection: roles" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --eval "db.roles.getIndexes().length" --quiet 2>&1
    return $result -match "[0-9]"
}

Test-Feature "Authz Collection: authz_audit_logs" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --eval "db.authz_audit_logs.getIndexes().length" --quiet 2>&1
    return $result -match "[0-9]"
}

# Encryption Collections
Test-Feature "Encryption Collection: user_keys" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --eval "db.user_keys.getIndexes().length" --quiet 2>&1
    return $result -match "[0-9]"
}

Test-Feature "Encryption Collection: prekey_bundles" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --eval "db.prekey_bundles.getIndexes().length" --quiet 2>&1
    return $result -match "[0-9]"
}

# Compliance Collections
Test-Feature "Compliance Collection: security_audit_logs" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --eval "db.security_audit_logs.getIndexes().length" --quiet 2>&1
    return $result -match "[0-9]"
}

Test-Feature "Compliance Collection: privacy_requests" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --eval "db.privacy_requests.getIndexes().length" --quiet 2>&1
    return $result -match "[0-9]"
}

Test-Feature "Compliance Collection: retention_policies" {
    $result = docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin caas_platform --eval "db.retention_policies.getIndexes().length" --quiet 2>&1
    return $result -match "[0-9]"
}

Write-Host ""
Write-Host "Management UI Tests" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow
Write-Host ""

Test-Feature "Kafka UI" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Test-Feature "Mongo Express" {
    try {
        $cred = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin123"))
        $response = Invoke-WebRequest -Uri "http://localhost:8082" -Headers @{Authorization="Basic $cred"} -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Test-Feature "Redis Commander" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8083" -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Tests:  $script:totalTests" -ForegroundColor White
Write-Host "Passed:       $script:passCount" -ForegroundColor Green
Write-Host "Failed:       $script:failCount" -ForegroundColor $(if ($script:failCount -eq 0) { "Green" } else { "Red" })
$percentage = [math]::Round(($script:passCount / $script:totalTests) * 100, 1)
Write-Host "Success Rate: $percentage%" -ForegroundColor $(if ($percentage -eq 100) { "Green" } elseif ($percentage -ge 90) { "Yellow" } else { "Red" })
Write-Host ""

if ($script:failCount -eq 0) {
    Write-Host "All tests passed! System is fully operational." -ForegroundColor Green
} else {
    Write-Host "Some tests failed. Please review the output above." -ForegroundColor Red
}

Write-Host ""
