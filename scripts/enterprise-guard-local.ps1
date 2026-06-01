# Enterprise Guard LOCAL — wrapper PowerShell (Agendador de Tarefas / execução manual)
# Uso:
#   .\scripts\enterprise-guard-local.ps1
#   .\scripts\enterprise-guard-local.ps1 -NoBuild
#   .\scripts\enterprise-guard-local.ps1 -IncludeFase4
#   .\scripts\enterprise-guard-local.ps1 -NoBuild -IncludeFase4

param(
  [switch]$NoBuild,
  [switch]$IncludeFase4
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== Enterprise Guard LOCAL ===" -ForegroundColor Cyan

$args = @("run", "guard:enterprise")
if ($NoBuild) { $args += "--", "--no-build" }
if ($IncludeFase4) { $args += "--", "--include-fase4" }

npm @args
exit $LASTEXITCODE
