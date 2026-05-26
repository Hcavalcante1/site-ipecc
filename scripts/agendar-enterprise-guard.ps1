# Agenda o Enterprise Guard LOCAL diariamente às 08:00 (Windows Task Scheduler).
# Execute PowerShell como Administrador se Register-ScheduledTask falhar.
#
# Uso:
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\scripts\agendar-enterprise-guard.ps1
#   .\scripts\agendar-enterprise-guard.ps1 -Remover

param([switch]$Remover)

$TaskName = "IPECC-Enterprise-Guard-Local"
$ScriptPath = Join-Path $PSScriptRoot "enterprise-guard-local.ps1"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if ($Remover) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Tarefa removida: $TaskName" -ForegroundColor Green
  exit 0
}

if (-not (Test-Path $ScriptPath)) {
  Write-Error "Script não encontrado: $ScriptPath"
}

$Action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`"" `
  -WorkingDirectory $ProjectRoot

$Trigger = New-ScheduledTaskTrigger -Daily -At "08:00"

$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Description "Gate enterprise local IPECC (npm run guard:enterprise)" `
  -Force | Out-Null

Write-Host "Tarefa agendada: $TaskName - diariamente 08:00" -ForegroundColor Green
Write-Host "Teste manual: npm run guard:enterprise" -ForegroundColor Yellow
Write-Host 'Remover: .\scripts\agendar-enterprise-guard.ps1 -Remover' -ForegroundColor DarkGray
