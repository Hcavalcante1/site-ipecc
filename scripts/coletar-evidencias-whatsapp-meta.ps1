# Uso:
#   .\scripts\coletar-evidencias-whatsapp-meta.ps1
#   .\scripts\coletar-evidencias-whatsapp-meta.ps1 -Parcial

param([switch]$Parcial)

$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path ".\reports")) {
  New-Item -ItemType Directory -Path ".\reports" | Out-Null
}

function Assert-LocalDevServer {
  try {
    $res = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -UseBasicParsing
    if ($res.StatusCode -lt 200 -or $res.StatusCode -ge 500) {
      throw "HTTP inesperado: $($res.StatusCode)"
    }
    Write-Host "OK: servidor local detectado em http://localhost:3000"
  } catch {
    Write-Error "FALHA: npm run dev não está acessível em http://localhost:3000. Inicie o servidor e rode novamente."
    exit 1
  }
}

Assert-LocalDevServer

# Garante artefatos limpos por execução.
$reportFiles = @(
  ".\reports\whatsapp-meta.txt",
  ".\reports\whatsapp-webhook.txt",
  ".\reports\whatsapp-webhook-http.txt",
  ".\reports\whatsapp-handoff-fase4.txt"
)
foreach ($f in $reportFiles) {
  if (Test-Path $f) { Remove-Item $f -Force }
}

Write-Host "Coletando evidencias WhatsApp Meta em ./reports (UTF-8) ..."

$coletarArgs = @("run", "coletar:reports-whatsapp-meta")
if ($Parcial) { $coletarArgs += "--", "--parcial" }
npm @coletarArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Concluido. Arquivos gerados:"
Write-Host " - reports/whatsapp-meta.txt"
Write-Host " - reports/whatsapp-webhook.txt"
Write-Host " - reports/whatsapp-webhook-http.txt"
Write-Host " - reports/whatsapp-handoff-fase4.txt"
