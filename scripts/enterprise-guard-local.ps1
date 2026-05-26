# Enterprise Guard LOCAL — wrapper PowerShell (Agendador de Tarefas / execução manual)
# Uso:
#   .\scripts\enterprise-guard-local.ps1
#   .\scripts\enterprise-guard-local.ps1 -NoBuild

param([switch]$NoBuild)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== Enterprise Guard LOCAL ===" -ForegroundColor Cyan

$args = @("run", "guard:enterprise")
if ($NoBuild) { $args += "--", "--no-build" }

npm @args
exit $LASTEXITCODE
