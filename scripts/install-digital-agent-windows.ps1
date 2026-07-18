#Requires -Version 5.1
<#
.SYNOPSIS
  Instalacao unica do agente Digital IPECC no Windows.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\install-digital-agent-windows.ps1
#>

$ErrorActionPreference = "Stop"
$TaskName = "IPECC-Digital-Publisher"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Node = Get-Command node -ErrorAction SilentlyContinue
if (-not $Node) {
  throw "Node.js nao encontrado no PATH. Instale Node LTS e rode de novo."
}
$NodeCmd = $Node.Source

$EnvLocal = Join-Path $RepoRoot ".env.local"
if (-not (Test-Path $EnvLocal)) {
  throw ("Falta .env.local na raiz do projeto: " + $RepoRoot)
}

$WorkerDir = Join-Path $RepoRoot "services\digital-publisher"
if (-not (Test-Path (Join-Path $WorkerDir "package.json"))) {
  throw "Pasta services/digital-publisher nao encontrada."
}

Write-Host "Instalando dependencias do worker (se necessario)..."
Push-Location $WorkerDir
try {
  npm install --silent
} finally {
  Pop-Location
}

$LogDir = Join-Path $WorkerDir "data\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$StdoutLog = Join-Path $LogDir "agent-stdout.log"
$StderrLog = Join-Path $LogDir "agent-stderr.log"

$Wrapper = Join-Path $WorkerDir "data\run-resident.cmd"
$WrapperLines = @(
  "@echo off"
  ("cd /d """ + $RepoRoot + """")
  "set DIGITAL_PUBLISH_DRY_RUN=false"
  "set DIGITAL_WORKER_ID=worker-pc"
  "set DIGITAL_BROWSER_CHANNEL=chrome"
  "set DIGITAL_BROWSER_HEADLESS=true"
  ('"' + $NodeCmd + '" scripts\run-digital-publisher.cjs --resident >> "' + $StdoutLog + '" 2>> "' + $StderrLog + '"')
)
Set-Content -Path $Wrapper -Value $WrapperLines -Encoding ASCII

$installedVia = $null

# 1) Tenta Agendador (usuario atual, sem /RU admin)
try {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

  $action = New-ScheduledTaskAction -Execute $Wrapper
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 0)

  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Force | Out-Null

  $installedVia = "agendador"
  Write-Host ("OK - tarefa do Agendador: " + $TaskName)
} catch {
  Write-Warning ("Agendador falhou: " + $_.Exception.Message)
  Write-Warning "Usando pasta Inicializar do Windows como alternativa."

  $startup = [Environment]::GetFolderPath("Startup")
  $lnkPath = Join-Path $startup "IPECC-Digital-Publisher.lnk"
  $wshell = New-Object -ComObject WScript.Shell
  $lnk = $wshell.CreateShortcut($lnkPath)
  $lnk.TargetPath = $Wrapper
  $lnk.WorkingDirectory = $RepoRoot
  $lnk.WindowStyle = 7
  $lnk.Description = "Agente Digital IPECC"
  $lnk.Save()
  $installedVia = "inicializar"
  Write-Host ("OK - atalho em: " + $lnkPath)
}

Write-Host ""
Write-Host ("  Repo:    " + $RepoRoot)
Write-Host ("  Wrapper: " + $Wrapper)
Write-Host ("  Logs:    " + $LogDir)
Write-Host ("  Via:     " + $installedVia)
Write-Host ""
Write-Host "IMPORTANTE - SQL no Supabase (uma vez):"
Write-Host "  Abra o SQL Editor e rode o arquivo:"
Write-Host "  docs\sql\digital-agents-resident.sql"
Write-Host ""
Write-Host "Iniciar agora:"
if ($installedVia -eq "agendador") {
  Write-Host ("  schtasks /Run /TN " + $TaskName)
} else {
  Write-Host ("  start """" """ + $Wrapper + """")
}
Write-Host "Depois: /admin/digital -> Agente conectado; Perfis -> Conectar"
Write-Host ""
Write-Host "Desinstalar: powershell -File scripts\uninstall-digital-agent-windows.ps1"

# Tenta iniciar imediatamente
try {
  if ($installedVia -eq "agendador") {
    Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
    Write-Host "Agente iniciado via Agendador."
  } else {
    Start-Process -FilePath $Wrapper -WindowStyle Minimized
    Write-Host "Agente iniciado via wrapper."
  }
} catch {
  Write-Warning ("Nao foi possivel iniciar agora: " + $_.Exception.Message)
  Write-Warning "Rode o comando de iniciar acima manualmente."
}
