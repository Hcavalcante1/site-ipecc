#Requires -Version 5.1
<#
.SYNOPSIS
  Remove o agente Digital IPECC (Agendador e/ou Inicializar).
#>
$ErrorActionPreference = "Continue"
$TaskName = "IPECC-Digital-Publisher"

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
schtasks /End /TN $TaskName 2>$null | Out-Null
schtasks /Delete /TN $TaskName /F 2>$null | Out-Null

$startup = [Environment]::GetFolderPath("Startup")
$lnkPath = Join-Path $startup "IPECC-Digital-Publisher.lnk"
if (Test-Path $lnkPath) {
  Remove-Item $lnkPath -Force
  Write-Host ("Removido atalho: " + $lnkPath)
}

Write-Host ("Tarefa '" + $TaskName + "' removida (se existia).")
Write-Host "Se o processo ainda estiver aberto, encerre o node do digital-publisher."
