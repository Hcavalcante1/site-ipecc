#Requires -Version 5.1
<#
.SYNOPSIS
  Instalação única do agente Digital IPECC no Windows (Agendador de Tarefas).

.DESCRIPTION
  - Inicia no logon do usuário
  - Reinicia em falha
  - Não abre segunda instância
  - Não depende de VS Code / terminal aberto
  - Publicação real (DIGITAL_PUBLISH_DRY_RUN=false)

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\install-digital-agent-windows.ps1
#>

$ErrorActionPreference = "Stop"
$TaskName = "IPECC-Digital-Publisher"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Node = Get-Command node -ErrorAction SilentlyContinue
if (-not $Node) {
  throw "Node.js não encontrado no PATH. Instale Node LTS e rode de novo."
}
$NodeCmd = $Node.Source

$EnvLocal = Join-Path $RepoRoot ".env.local"
if (-not (Test-Path $EnvLocal)) {
  throw "Falta .env.local na raiz do projeto ($RepoRoot)."
}

$WorkerDir = Join-Path $RepoRoot "services\digital-publisher"
if (-not (Test-Path (Join-Path $WorkerDir "package.json"))) {
  throw "Pasta services/digital-publisher não encontrada."
}

Write-Host "Instalando dependências do worker (se necessário)..."
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

# Wrapper .cmd ocultável pelo Agendador
$Wrapper = Join-Path $WorkerDir "data\run-resident.cmd"
$WrapperContent = @"
@echo off
cd /d "$RepoRoot"
set DIGITAL_PUBLISH_DRY_RUN=false
set DIGITAL_WORKER_ID=worker-pc
set DIGITAL_BROWSER_CHANNEL=chrome
set DIGITAL_BROWSER_HEADLESS=true
"$NodeCmd" scripts\run-digital-publisher.cjs --resident >> "$StdoutLog" 2>> "$StderrLog"
"@
Set-Content -Path $Wrapper -Value $WrapperContent -Encoding ASCII

# Remove tarefa antiga
schtasks /Delete /TN $TaskName /F 2>$null | Out-Null

$User = "$env:USERDOMAIN\$env:USERNAME"
# /SC ONLOGON = inicia com o Windows (após login)
# /F força; /RL LIMITED = usuário atual (Chrome/perfil)
$Create = schtasks /Create /TN $TaskName /TR "`"$Wrapper`"" /SC ONLOGON /RL LIMITED /F /RU $User
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao criar tarefa: $Create"
}

# Ajustes via PowerShell: reinício, sem múltiplas instâncias, sem limite de tempo
try {
  $task = Get-ScheduledTask -TaskName $TaskName
  $settings = $task.Settings
  $settings.MultipleInstances = "IgnoreNew"
  $settings.RestartCount = 3
  $settings.RestartInterval = "PT1M"
  $settings.ExecutionTimeLimit = "PT0S"
  $settings.AllowDemandStart = $true
  $settings.StartWhenAvailable = $true
  $settings.DisallowStartIfOnBatteries = $false
  $settings.StopIfGoingOnBatteries = $false
  Set-ScheduledTask -TaskName $TaskName -Settings $settings | Out-Null
} catch {
  Write-Warning "Tarefa criada, mas ajustes avançados falharam: $_"
  Write-Warning "Ainda assim o ONLOGON deve funcionar."
}

Write-Host ""
Write-Host "OK — tarefa '$TaskName' instalada."
Write-Host "  Repo:   $RepoRoot"
Write-Host "  Wrapper:$Wrapper"
Write-Host "  Logs:   $LogDir"
Write-Host ""
Write-Host "Próximos passos:"
Write-Host "  1) node scripts/aplicar-digital-agents-resident.cjs   (ou SQL Editor)"
Write-Host "  2) Inicie agora:  schtasks /Run /TN $TaskName"
Write-Host "  3) No admin /admin/digital veja 'Agente conectado'"
Write-Host "  4) Conectar conta Meta uma vez (Perfis → Conectar)"
Write-Host ""
Write-Host "Desinstalar: powershell -File scripts\uninstall-digital-agent-windows.ps1"
