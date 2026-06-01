$ErrorActionPreference = "Stop"

Write-Host "=== Diagnóstico de Operação Enterprise ===" -ForegroundColor Cyan

$repo = Join-Path $PSScriptRoot ".."
Set-Location $repo

Write-Host "`n[1/4] Agendamento do Enterprise Guard" -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File ".\scripts\verificar-enterprise-guard-agendamento.ps1"

Write-Host "`n[2/4] Último resultado do guard" -ForegroundColor Yellow
$lastGuard = ".\reports\enterprise-guard-last.txt"
if (Test-Path $lastGuard) {
  Get-Content $lastGuard | ForEach-Object { Write-Host "  $_" }
} else {
  Write-Host "  AUSENTE: reports/enterprise-guard-last.txt" -ForegroundColor Yellow
}

Write-Host "`n[3/4] Artefatos da Fase 4 (WhatsApp Meta)" -ForegroundColor Yellow
$fase4Reports = @(
  ".\reports\whatsapp-meta.txt",
  ".\reports\whatsapp-webhook.txt",
  ".\reports\whatsapp-webhook-http.txt",
  ".\reports\whatsapp-handoff-fase4.txt"
)

foreach ($f in $fase4Reports) {
  if (Test-Path $f) {
    $item = Get-Item $f
    Write-Host ("  OK: {0} ({1} bytes, {2})" -f $f, $item.Length, $item.LastWriteTime)
  } else {
    Write-Host ("  AUSENTE: {0}" -f $f) -ForegroundColor Yellow
  }
}

Write-Host "`n[4/4] DoD Fase 4 (parcial, se reports existirem)" -ForegroundColor Yellow
$allReports = $true
foreach ($f in $fase4Reports) {
  if (-not (Test-Path $f)) { $allReports = $false }
}
if ($allReports) {
  npm run validar:dod-whatsapp-meta:parcial
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARN: DoD parcial com falha (reexecute coletar:evidencias-whatsapp-meta:parcial)" -ForegroundColor Yellow
  }
} else {
  Write-Host "  SKIP: reports incompletos — npm run coletar:evidencias-whatsapp-meta:parcial" -ForegroundColor DarkGray
}

Write-Host "`nDiagnóstico concluído." -ForegroundColor Green
