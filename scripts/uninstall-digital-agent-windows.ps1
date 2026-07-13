#Requires -Version 5.1
<#
.SYNOPSIS
  Remove o agente Digital IPECC do Agendador de Tarefas.
#>
$ErrorActionPreference = "Continue"
$TaskName = "IPECC-Digital-Publisher"

schtasks /End /TN $TaskName 2>$null | Out-Null
schtasks /Delete /TN $TaskName /F 2>$null | Out-Null

Write-Host "Tarefa '$TaskName' removida (se existia)."
Write-Host "Se o processo ainda estiver aberto, encerre a janela/node do digital-publisher."
