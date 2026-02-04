# CAAS Platform Stop Script
# ============================================
# Single command to stop entire CAAS Platform

param(
    [switch]$Volumes,    # Also remove volumes (data)
    [switch]$Force       # Force remove containers
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                   CAAS Platform Shutdown                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
Write-Host ""

# Build command
$composeCmd = "docker compose down"
if ($Volumes) {
    $composeCmd += " -v"
    Write-Host "   ⚠️  Removing volumes (all data will be deleted)" -ForegroundColor Red
}
if ($Force) {
    $composeCmd += " --remove-orphans"
}

# Execute
Invoke-Expression $composeCmd

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                   ✅ All Services Stopped!                    ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

if (-not $Volumes) {
    Write-Host "💡 Data is preserved in Docker volumes." -ForegroundColor Yellow
    Write-Host "   To remove all data: .\stop.ps1 -Volumes" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🚀 To start again: .\start.ps1" -ForegroundColor Cyan
Write-Host ""
