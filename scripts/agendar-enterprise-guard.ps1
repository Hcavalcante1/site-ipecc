# Agenda o Enterprise Guard LOCAL diariamente às 08:00 (Windows Task Scheduler).
# Execute PowerShell como Administrador se Register-ScheduledTask falhar.
#
# Uso:
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\scripts\agendar-enterprise-guard.ps1
#   .\scripts\agendar-enterprise-guard.ps1 -IncludeFase4
#   .\scripts\agendar-enterprise-guard.ps1 -Remover
#   .\scripts\agendar-enterprise-guard.ps1 -Remover -IncludeFase4
#   .\scripts\agendar-enterprise-guard.ps1 -RemoverTodos

param(
  [switch]$Remover,
  [switch]$IncludeFase4,
  [switch]$RemoverTodos
)

$TaskName = if ($IncludeFase4) {
  "IPECC-Enterprise-Guard-Local-Fase4"
} else {
  "IPECC-Enterprise-Guard-Local"
}
$ScriptPath = Join-Path $PSScriptRoot "enterprise-guard-local.ps1"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if ($RemoverTodos) {
  $names = @(
    "IPECC-Enterprise-Guard-Local",
    "IPECC-Enterprise-Guard-Local-Fase4"
  )
  foreach ($n in $names) {
    Unregister-ScheduledTask -TaskName $n -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Tarefa removida (se existia): $n" -ForegroundColor Green
  }
  exit 0
}

if ($Remover) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Tarefa removida (se existia): $TaskName" -ForegroundColor Green
  exit 0
}

if (-not (Test-Path $ScriptPath)) {
  Write-Error "Script não encontrado: $ScriptPath"
}

$Action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument ("-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`"" + ($(if ($IncludeFase4) { " -IncludeFase4" } else { "" }))) `
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
  -Description ("Gate enterprise local IPECC (npm run guard:enterprise" + ($(if ($IncludeFase4) { " -- --include-fase4" } else { "" })) + ")") `
  -Force | Out-Null

Write-Host "Tarefa agendada: $TaskName - diariamente 08:00" -ForegroundColor Green
Write-Host ("Teste manual: npm run guard:enterprise" + ($(if ($IncludeFase4) { " -- --include-fase4" } else { "" }))) -ForegroundColor Yellow
Write-Host 'Remover padrão: .\scripts\agendar-enterprise-guard.ps1 -Remover' -ForegroundColor DarkGray
Write-Host 'Remover Fase 4: .\scripts\agendar-enterprise-guard.ps1 -Remover -IncludeFase4' -ForegroundColor DarkGray
Write-Host 'Remover ambas:  .\scripts\agendar-enterprise-guard.ps1 -RemoverTodos' -ForegroundColor DarkGray
