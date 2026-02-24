<#
  CAAS Docker-Only End-to-End Observability Runner

  What it does:
  1) Stops stack via stop.ps1
  2) Starts fresh via start.ps1 -Clean
  3) Runs a Dockerized Node HTTP+Socket exhaustive runner
  4) Captures per-case service log windows
  5) Writes detailed Markdown + raw JSON reports
#>

param(
    [switch]$SkipLifecycle,
    [string]$ReportsDir = ".\tests\reports",
    [string]$GatewayUrl = "http://gateway:3000",
    [string]$AuthServiceUrl = "http://auth-service:3001",
    [string]$ComplianceServiceUrl = "http://compliance-service:3008",
    [string]$CryptoServiceUrl = "http://crypto-service:3009",
    [string]$SearchServiceUrl = "http://search-service:3006",
    [string]$MediaServiceUrl = "http://media-service:3005",
    [string]$Socket1Url = "http://socket-service-1:3001",
    [string]$Socket2Url = "http://socket-service-2:3001"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

if (-not (Test-Path $ReportsDir)) {
    New-Item -ItemType Directory -Path $ReportsDir -Force | Out-Null
}

$rawReportPath = Join-Path $ReportsDir "e2e-system-raw-$timestamp.json"
$mdReportPath = Join-Path $ReportsDir "e2e-system-report-$timestamp.md"

function Write-Section([string]$line = "") {
    Add-Content -Path $mdReportPath -Value $line -Encoding UTF8
}

function Invoke-Checked([scriptblock]$Script, [string]$ErrorMessage) {
    & $Script
    if ($LASTEXITCODE -ne 0) {
        throw $ErrorMessage
    }
}

function Wait-HttpReady {
    param(
        [string]$Name,
        [string]$Url,
        [int]$TimeoutSeconds = 120
    )

    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 5
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
                return $true
            }
        } catch {
        }

        Start-Sleep -Seconds 3
        $elapsed += 3
    }

    return $false
}

function Get-LogSlice {
    param(
        [string]$Container,
        [string]$SinceIso,
        [string]$UntilIso,
        [int]$MaxLines = 25
    )

    try {
        $logs = docker logs --since $SinceIso --until $UntilIso $Container 2>&1 | Out-String
        if (-not $logs) { return "" }

        $lines = $logs -split "`r?`n" | Where-Object { $_ -and $_.Trim().Length -gt 0 }
        if (-not $lines -or $lines.Count -eq 0) { return "" }

        if ($lines.Count -gt $MaxLines) {
            $lines = $lines[($lines.Count - $MaxLines)..($lines.Count - 1)]
        }

        return ($lines -join "`n")
    } catch {
        return ""
    }
}

function Get-ContainersForCase {
    param(
        [object]$Case
    )

    $names = New-Object System.Collections.Generic.List[string]

    if ($Case.type -eq "socket") {
        if ($Case.request.socketUrl -like "*socket-service-1*") { $names.Add("caas-socket-1") }
        if ($Case.request.socketUrl -like "*socket-service-2*") { $names.Add("caas-socket-2") }
        $names.Add("caas-auth-service")
    }
    elseif ($Case.type -eq "http") {
        $url = [string]$Case.request.url
        if ($url -like "*gateway*") { $names.Add("caas-gateway") }
        if ($url -like "*auth-service*") { $names.Add("caas-auth-service") }
        if ($url -like "*compliance-service*") { $names.Add("caas-compliance-service") }
        if ($url -like "*crypto-service*") { $names.Add("caas-crypto-service") }
        if ($url -like "*search-service*") { $names.Add("caas-search-service") }
        if ($url -like "*media-service*") { $names.Add("caas-media-service") }
    }

    if ($names.Count -eq 0) {
        $names.Add("caas-gateway")
    }

    # Deduplicate
    return $names | Select-Object -Unique
}

Push-Location $repoRoot
try {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "CAAS E2E Observability (Docker-Only)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    if (-not $SkipLifecycle) {
        Write-Host "1) Stopping existing stack..." -ForegroundColor Yellow
        Invoke-Checked -Script { & .\stop.ps1 } -ErrorMessage "stop.ps1 failed"

        Write-Host "2) Starting fresh stack (clean)..." -ForegroundColor Yellow
        & .\start.ps1 -Clean
        $startExit = $LASTEXITCODE

        Write-Host "   Verifying core services after startup..." -ForegroundColor Gray
        $gatewayReady = Wait-HttpReady -Name "gateway" -Url "http://localhost:3000/health" -TimeoutSeconds 180
        $authReady = Wait-HttpReady -Name "auth" -Url "http://localhost:3007/health" -TimeoutSeconds 120
        $searchReady = Wait-HttpReady -Name "search" -Url "http://localhost:3006/health" -TimeoutSeconds 120
        $socketReady = Wait-HttpReady -Name "socket-1" -Url "http://localhost:3002/health" -TimeoutSeconds 120

        if (-not ($gatewayReady -and $authReady -and $searchReady -and $socketReady)) {
            throw "start.ps1 -Clean failed and services are not healthy"
        }

        if ($startExit -ne 0) {
            Write-Host "   start.ps1 returned non-zero ($startExit) but core services are healthy; continuing." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Lifecycle skipped (using existing running stack)." -ForegroundColor Yellow
    }

    Write-Host "3) Capturing compose status..." -ForegroundColor Yellow
    $composePs = docker compose ps 2>&1 | Out-String

    $testsPath = (Resolve-Path ".\tests").Path
    $rawFileName = Split-Path $rawReportPath -Leaf
    $ServiceSecretStr = if ($env:SERVICE_SECRET) { $env:SERVICE_SECRET } else { "dev-service-secret-change-in-production" }
    $runnerScript = "npm ci --silent; node e2e-system-scratch.js --out /tests/reports/$rawFileName --gatewayUrl $GatewayUrl --authServiceUrl $AuthServiceUrl --complianceServiceUrl $ComplianceServiceUrl --cryptoServiceUrl $CryptoServiceUrl --searchServiceUrl $SearchServiceUrl --mediaServiceUrl $MediaServiceUrl --socket1Url $Socket1Url --socket2Url $Socket2Url --serviceSecret $ServiceSecretStr"

    Write-Host "4) Running Dockerized HTTP + Socket E2E suite..." -ForegroundColor Yellow
    $runnerOutput = & docker run --rm `
        --network caas_caas-network `
        -v "${testsPath}:/tests" `
        -w /tests `
        node:20-alpine `
        sh -lc $runnerScript 2>&1 | Out-String
    $runnerExit = $LASTEXITCODE

    if (-not (Test-Path $rawReportPath)) {
        throw "Raw report not generated at: $rawReportPath"
    }

    Write-Host "5) Building markdown report with per-request service logs..." -ForegroundColor Yellow

    $raw = Get-Content $rawReportPath -Raw -Encoding UTF8 | ConvertFrom-Json

    Write-Section "# CAAS Platform - Full E2E Observability Report"
    Write-Section ""
    Write-Section "**Generated:** $(Get-Date -Format u)"
    Write-Section "**Raw Report:** $(Split-Path $rawReportPath -Leaf)"
    Write-Section "**Runner Exit Code:** $runnerExit"
    Write-Section ""
    Write-Section "## Stack Reset"
    Write-Section "- Used stop/start scripts: $([bool](-not $SkipLifecycle))"
    Write-Section "- Docker-only test runtime: yes"
    Write-Section ""
    Write-Section "## Docker Compose Status"
    Write-Section '```text'
    Write-Section $composePs.TrimEnd()
    Write-Section '```'
    Write-Section ""
    Write-Section "## Runner Console Output"
    Write-Section '```text'
    Write-Section $runnerOutput.TrimEnd()
    Write-Section '```'
    Write-Section ""
    Write-Section "## Summary"
    Write-Section "- Total Cases: $($raw.summary.total)"
    Write-Section "- Passed: $($raw.summary.passed)"
    Write-Section "- Warnings: $($raw.summary.warnings)"
    Write-Section "- Failed: $($raw.summary.failed)"
    Write-Section ""

    $index = 0
    foreach ($case in $raw.cases) {
        $index++

        $started = [DateTimeOffset]::Parse($case.startedAt).AddSeconds(-2).ToString("o")
        $ended = [DateTimeOffset]::Parse($case.endedAt).AddSeconds(2).ToString("o")

        Write-Section "## [$index] $($case.name)"
        Write-Section "- **Type:** $($case.type)"
        Write-Section "- **Outcome:** $($case.outcome)"
        Write-Section "- **Started:** $($case.startedAt)"
        Write-Section "- **Ended:** $($case.endedAt)"

        if ($case.tags) {
            Write-Section "- **Tags:** $([string]::Join(', ', $case.tags))"
        }

        Write-Section ""
        Write-Section "### Request"
        Write-Section '```json'
        Write-Section (($case.request | ConvertTo-Json -Depth 20) -replace "\r?\n$", "")
        Write-Section '```'
        Write-Section ""
        Write-Section "### Response"
        Write-Section '```json'
        Write-Section (($case.response | ConvertTo-Json -Depth 20) -replace "\r?\n$", "")
        Write-Section '```'
        Write-Section ""

        Write-Section "### Service Reaction Logs"
        $containers = Get-ContainersForCase -Case $case
        foreach ($container in $containers) {
            $slice = Get-LogSlice -Container $container -SinceIso $started -UntilIso $ended -MaxLines 25
            if ($slice -and $slice.Trim().Length -gt 0) {
                Write-Section "#### $container"
                Write-Section '```text'
                Write-Section $slice.TrimEnd()
                Write-Section '```'
            }
        }

        Write-Section ""
        Write-Section "---"
        Write-Section ""
    }

    Write-Host ""
    Write-Host "Done." -ForegroundColor Green
    Write-Host "Raw report: $rawReportPath" -ForegroundColor Cyan
    Write-Host "Markdown report: $mdReportPath" -ForegroundColor Cyan

    if ($runnerExit -ne 0) {
        exit 2
    }
} finally {
    Pop-Location
}
