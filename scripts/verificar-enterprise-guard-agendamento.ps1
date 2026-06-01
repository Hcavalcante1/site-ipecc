$ErrorActionPreference = "Stop"

$taskNames = @(
  "IPECC-Enterprise-Guard-Local",
  "IPECC-Enterprise-Guard-Local-Fase4"
)

Write-Host "=== Verificação de agendamento Enterprise Guard ===" -ForegroundColor Cyan

foreach ($name in $taskNames) {
  $task = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  if (-not $task) {
    Write-Host "[AUSENTE] $name" -ForegroundColor Yellow
    continue
  }

  $info = Get-ScheduledTaskInfo -TaskName $name
  $state = $task.State
  $next = $info.NextRunTime
  $last = $info.LastRunTime
  $result = $info.LastTaskResult

  Write-Host "[OK] $name" -ForegroundColor Green
  Write-Host "  Estado: $state"
  Write-Host "  Próxima execução: $next"
  Write-Host "  Última execução:  $last"
  Write-Host "  Último código:    $result"
}

Write-Host "`nDica: veja também reports/enterprise-guard-last.txt" -ForegroundColor DarkGray
