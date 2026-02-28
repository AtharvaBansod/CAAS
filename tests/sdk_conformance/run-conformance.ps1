$ErrorActionPreference = 'Stop'

$services = @(
  'sdk-node-ts-tests',
  'sdk-python-tests',
  'sdk-java-tests',
  'sdk-dotnet-tests',
  'sdk-ruby-tests',
  'sdk-rust-tests',
  'sdk-react-tests',
  'sdk-angular-tests'
)

$results = @()

foreach ($service in $services) {
  Write-Host "Running $service..." -ForegroundColor Cyan
  docker compose --profile test run --rm --build $service
  $ok = $LASTEXITCODE -eq 0
  $results += [pscustomobject]@{
    service = $service
    status = if ($ok) { 'passed' } else { 'failed' }
  }
  if (-not $ok) {
    Write-Host "$service failed" -ForegroundColor Red
  }
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$summary = [pscustomobject]@{
  generated_at = (Get-Date).ToUniversalTime().ToString('o')
  total = $results.Count
  passed = ($results | Where-Object { $_.status -eq 'passed' }).Count
  failed = ($results | Where-Object { $_.status -eq 'failed' }).Count
  results = $results
}

$jsonPath = "tests/sdk_conformance/reports/sdk-conformance-$stamp.json"
$mdPath = "tests/sdk_conformance/reports/sdk-conformance-$stamp.md"

$summary | ConvertTo-Json -Depth 6 | Set-Content $jsonPath

$md = @()
$md += '# SDK Conformance Report'
$md += "- Generated: $($summary.generated_at)"
$md += "- Total: $($summary.total)"
$md += "- Passed: $($summary.passed)"
$md += "- Failed: $($summary.failed)"
$md += ''
$md += '| Service | Status |'
$md += '|---|---|'
foreach ($row in $results) {
  $md += "| $($row.service) | $($row.status) |"
}
$md -join "`n" | Set-Content $mdPath

Write-Host "Conformance JSON: $jsonPath" -ForegroundColor Green
Write-Host "Conformance MD: $mdPath" -ForegroundColor Green

if ($summary.failed -gt 0) {
  exit 1
}
