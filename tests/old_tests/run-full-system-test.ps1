<#
  CAAS Full System Test - Docker-Only Runner
  ===========================================
  This script orchestrates a complete platform validation:
    1) Stops the entire stack via stop.ps1
    2) Starts a clean stack via start.ps1 -Clean
    3) Waits for ALL services to be healthy
    4) Runs e2e-full-system.js inside a Docker container (on the internal network)
    5) Collects per-test-case service logs
    6) Generates a detailed Markdown report + raw JSON

  Usage:
    .\tests\run-full-system-test.ps1                     # full lifecycle
    .\tests\run-full-system-test.ps1 -SkipLifecycle      # reuse running stack
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

$rawReportPath = Join-Path $ReportsDir "full-system-raw-$timestamp.json"
$mdReportPath  = Join-Path $ReportsDir "full-system-report-$timestamp.md"

# --- Helpers ---

function Write-Section([string]$line = "") {
    Add-Content -Path $mdReportPath -Value $line -Encoding UTF8
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
                Write-Host "     [OK] $Name is healthy" -ForegroundColor Green
                return $true
            }
        } catch {
            # Service not ready yet, retry
        }
        Start-Sleep -Seconds 3
        $elapsed += 3
    }
    Write-Host "     [FAIL] $Name did NOT become healthy within ${TimeoutSeconds}s" -ForegroundColor Red
    return $false
}

function Get-LogSlice {
    param(
        [string]$Container,
        [string]$SinceIso,
        [string]$UntilIso,
        [int]$MaxLines = 30
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
    param([object]$Case)
    $names = New-Object System.Collections.Generic.List[string]

    if ($Case.type -eq "socket") {
        if ($Case.request.socketUrl -like "*socket-service-1*") { $names.Add("caas-socket-1") }
        if ($Case.request.socketUrl -like "*socket-service-2*") { $names.Add("caas-socket-2") }
        $names.Add("caas-auth-service")
    }
    elseif ($Case.type -eq "http") {
        $url = [string]$Case.request.url
        if ($url -like "*gateway*")            { $names.Add("caas-gateway") }
        if ($url -like "*auth-service*")       { $names.Add("caas-auth-service") }
        if ($url -like "*compliance-service*") { $names.Add("caas-compliance-service") }
        if ($url -like "*crypto-service*")     { $names.Add("caas-crypto-service") }
        if ($url -like "*search-service*")     { $names.Add("caas-search-service") }
        if ($url -like "*media-service*")      { $names.Add("caas-media-service") }
    }
    if ($names.Count -eq 0) { $names.Add("caas-gateway") }
    return $names | Select-Object -Unique
}

# --- Main Flow ---

Push-Location $repoRoot
try {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  CAAS Full System Test  (Docker-Only)    " -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""

    # -- Step 1: Lifecycle --
    if (-not $SkipLifecycle) {
        Write-Host "Step 1) Stopping existing stack..." -ForegroundColor Yellow
        & .\stop.ps1
        Write-Host ""

        Write-Host "Step 2) Starting fresh stack (clean build)..." -ForegroundColor Yellow
        & .\start.ps1 -Clean
        $startExit = $LASTEXITCODE
        Write-Host ""

        Write-Host "Step 3) Waiting for ALL services to be healthy..." -ForegroundColor Yellow
        $allReady = $true
        $allReady = (Wait-HttpReady -Name "Gateway"         -Url "http://localhost:3000/health" -TimeoutSeconds 180) -and $allReady
        $allReady = (Wait-HttpReady -Name "Auth Service"    -Url "http://localhost:3007/health" -TimeoutSeconds 120) -and $allReady
        $allReady = (Wait-HttpReady -Name "Search Service"  -Url "http://localhost:3006/health" -TimeoutSeconds 120) -and $allReady
        $allReady = (Wait-HttpReady -Name "Media Service"   -Url "http://localhost:3005/health" -TimeoutSeconds 120) -and $allReady
        $allReady = (Wait-HttpReady -Name "Compliance"      -Url "http://localhost:3008/health" -TimeoutSeconds 120) -and $allReady
        $allReady = (Wait-HttpReady -Name "Crypto"          -Url "http://localhost:3009/health" -TimeoutSeconds 120) -and $allReady
        $allReady = (Wait-HttpReady -Name "Socket-1"        -Url "http://localhost:3002/health" -TimeoutSeconds 120) -and $allReady
        $allReady = (Wait-HttpReady -Name "Socket-2"        -Url "http://localhost:3003/health" -TimeoutSeconds 120) -and $allReady

        if (-not $allReady) {
            throw "Not all services became healthy after start.ps1 -Clean"
        }

        if ($startExit -ne 0) {
            Write-Host "   start.ps1 returned non-zero ($startExit) but services are healthy; continuing." -ForegroundColor Yellow
        }
        Write-Host ""
    } else {
        Write-Host "Lifecycle skipped - using existing running stack." -ForegroundColor Yellow
        Write-Host ""
    }

    # -- Step 4: Capture compose status --
    Write-Host "Step 4) Capturing compose status..." -ForegroundColor Yellow
    $composePs = docker compose ps 2>&1 | Out-String

    # -- Step 5: Run the test inside Docker --
    $testsPath = (Resolve-Path ".\tests").Path
    $rawFileName = Split-Path $rawReportPath -Leaf
    $ServiceSecretVal = "dev-service-secret-change-in-production"
    if ($env:SERVICE_SECRET) { $ServiceSecretVal = $env:SERVICE_SECRET }

    $runnerScript = "npm ci --silent 2>&1; node e2e-full-system.js --out /tests/reports/$rawFileName --gatewayUrl $GatewayUrl --authServiceUrl $AuthServiceUrl --complianceServiceUrl $ComplianceServiceUrl --cryptoServiceUrl $CryptoServiceUrl --searchServiceUrl $SearchServiceUrl --mediaServiceUrl $MediaServiceUrl --socket1Url $Socket1Url --socket2Url $Socket2Url --serviceSecret $ServiceSecretVal"

    Write-Host "Step 5) Running Full System Test inside Docker..." -ForegroundColor Yellow
    Write-Host "         (This may take 1-2 minutes)" -ForegroundColor Gray
    $runnerOutput = & docker run --rm `
        --network caas_caas-network `
        -v "${testsPath}:/tests" `
        -w /tests `
        node:20-alpine `
        sh -lc $runnerScript 2>&1 | Out-String
    $runnerExit = $LASTEXITCODE

    if (-not (Test-Path $rawReportPath)) {
        Write-Host "ERROR: Raw report was not generated at: $rawReportPath" -ForegroundColor Red
        Write-Host "Runner output:" -ForegroundColor Yellow
        Write-Host $runnerOutput
        throw "Raw report not generated"
    }

    # -- Step 6: Build Markdown report --
    Write-Host "Step 6) Building Markdown report with service logs..." -ForegroundColor Yellow

    $raw = Get-Content $rawReportPath -Raw -Encoding UTF8 | ConvertFrom-Json

    # Header
    Write-Section "# CAAS Platform - Full System Test Report"
    Write-Section ""
    Write-Section "**Generated:** $(Get-Date -Format u)"
    Write-Section "**Raw Report:** $(Split-Path $rawReportPath -Leaf)"
    Write-Section "**Runner Exit Code:** $runnerExit"
    $lifecycleNote = "Full stop then clean start"
    if ($SkipLifecycle) { $lifecycleNote = "Skipped (reusing running stack)" }
    Write-Section "**Stack Lifecycle:** $lifecycleNote"
    Write-Section ""

    # Summary
    Write-Section "## Summary"
    Write-Section ""
    Write-Section "| Metric | Count |"
    Write-Section "|--------|-------|"
    Write-Section "| **Total Tests** | $($raw.summary.total) |"
    Write-Section "| **Passed** | $($raw.summary.passed) |"
    Write-Section "| **Warnings** | $($raw.summary.warnings) |"
    Write-Section "| **Failed** | $($raw.summary.failed) |"
    Write-Section ""

    if ($raw.summary.failed -eq 0) {
        Write-Section "> ALL TESTS PASSED - The entire CAAS platform is verified and operational."
    } else {
        Write-Section "> $($raw.summary.failed) TEST(S) FAILED - See details below."
    }
    Write-Section ""

    # Phase breakdown
    if ($raw.phases) {
        Write-Section "## Phase Breakdown"
        Write-Section ""
        Write-Section "| Phase | Name | Tests | Passed | Warn | Fail |"
        Write-Section "|-------|------|-------|--------|------|------|"
        foreach ($ph in $raw.phases) {
            $sectionKey = $ph.label
            $sec = $null
            if ($raw.sections.PSObject.Properties[$sectionKey]) {
                $sec = $raw.sections.$sectionKey
            }
            if ($sec) {
                Write-Section "| $($ph.phase) | $($ph.label) | $($sec.total) | $($sec.passed) | $($sec.warnings) | $($sec.failed) |"
            } else {
                Write-Section "| $($ph.phase) | $($ph.label) | - | - | - | - |"
            }
        }
        Write-Section ""
    }

    # Docker status
    Write-Section "## Docker Compose Status"
    Write-Section '```text'
    Write-Section $composePs.TrimEnd()
    Write-Section '```'
    Write-Section ""

    # Runner console output
    Write-Section "## Runner Console Output"
    Write-Section '```text'
    Write-Section $runnerOutput.TrimEnd()
    Write-Section '```'
    Write-Section ""

    # Individual test cases
    Write-Section "## Detailed Test Cases"
    Write-Section ""

    $index = 0
    foreach ($case in $raw.cases) {
        $index++

        $started = [DateTimeOffset]::Parse($case.startedAt).AddSeconds(-2).ToString("o")
        $ended   = [DateTimeOffset]::Parse($case.endedAt).AddSeconds(2).ToString("o")

        $icon = switch ($case.outcome) {
            "passed"  { "PASS" }
            "warning" { "WARN" }
            "failed"  { "FAIL" }
            default   { "SKIP" }
        }

        Write-Section "### [$index] [$icon] $($case.name)"
        Write-Section "- **Type:** $($case.type)"
        Write-Section "- **Phase:** $($case.phase)"
        Write-Section "- **Outcome:** $($case.outcome)"

        try {
            $durationMs = ([DateTimeOffset]::Parse($case.endedAt) - [DateTimeOffset]::Parse($case.startedAt)).TotalMilliseconds
            Write-Section "- **Duration:** $([math]::Round($durationMs))ms"
        } catch {
            Write-Section "- **Duration:** unknown"
        }

        if ($case.tags) {
            Write-Section "- **Tags:** $([string]::Join(', ', $case.tags))"
        }

        Write-Section ""

        Write-Section "**Request:**"
        Write-Section '```json'
        Write-Section (($case.request | ConvertTo-Json -Depth 20) -replace "\r?\n$", "")
        Write-Section '```'
        Write-Section ""
        Write-Section "**Response:**"
        Write-Section '```json'
        Write-Section (($case.response | ConvertTo-Json -Depth 20) -replace "\r?\n$", "")
        Write-Section '```'
        Write-Section ""

        # Service logs
        $containers = Get-ContainersForCase -Case $case
        $hasLogs = $false
        foreach ($container in $containers) {
            $slice = Get-LogSlice -Container $container -SinceIso $started -UntilIso $ended -MaxLines 30
            if ($slice -and $slice.Trim().Length -gt 0) {
                if (-not $hasLogs) {
                    Write-Section "**Service Logs:**"
                    $hasLogs = $true
                }
                Write-Section "${container}:"
                Write-Section '```text'
                Write-Section $slice.TrimEnd()
                Write-Section '```'
            }
        }

        Write-Section ""
        Write-Section "---"
        Write-Section ""
    }

    # -- Done --
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  DONE" -ForegroundColor Green
    Write-Host "  Raw JSON : $rawReportPath" -ForegroundColor White
    Write-Host "  Markdown : $mdReportPath" -ForegroundColor White
    Write-Host ""
    $summaryColor = "Green"
    if ($raw.summary.failed -gt 0) { $summaryColor = "Red" }
    Write-Host "  Summary: Total=$($raw.summary.total) Passed=$($raw.summary.passed) Warnings=$($raw.summary.warnings) Failed=$($raw.summary.failed)" -ForegroundColor $summaryColor
    Write-Host "==========================================" -ForegroundColor Cyan

    if ($runnerExit -ne 0) {
        exit 2
    }
} finally {
    Pop-Location
}
