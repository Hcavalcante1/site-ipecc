# Push seguro para GitHub (valida stage, configura remote, envia branch).
# Uso:
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\scripts\push-prep.ps1 -RemoteUrl "https://github.com/USUARIO/repo.git" -Push
#   .\scripts\push-prep.ps1 -RemoteUrl "..." -Push -UseMain   # renomeia branch local para main

param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteUrl,
  [switch]$Push,
  [switch]$UseMain,
  [string]$Branch = ""
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$RemoteUrl = $RemoteUrl.Trim()
if ($RemoteUrl -notmatch "^https://github\.com/.+\.git$") {
  Write-Error "RemoteUrl inválida. Use HTTPS: https://github.com/USUARIO/repo.git"
}

Write-Host "=== push-prep ===" -ForegroundColor Cyan
Write-Host "Remote: $RemoteUrl"

$blocked = @(".env.local", ".env", ".cursor", "reports")
$staged = @(git diff --cached --name-only 2>$null)
foreach ($name in $staged) {
  foreach ($b in $blocked) {
    if ($name -like "*$b*") {
      Write-Error "BLOQUEADO: '$name' está no stage. Remova antes do push."
    }
  }
}

$hasOrigin = $false
git remote get-url origin 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { $hasOrigin = $true }

if (-not $hasOrigin) {
  git remote add origin $RemoteUrl
  Write-Host "Remote origin adicionado."
} else {
  $current = (git remote get-url origin).Trim()
  if ($current -ne $RemoteUrl) {
    git remote set-url origin $RemoteUrl
    Write-Host "Remote origin atualizado: $RemoteUrl"
  } else {
    Write-Host "Remote origin OK."
  }
}

if ($UseMain) {
  $localBranch = (git branch --show-current).Trim()
  if ($localBranch -ne "main") {
    git branch -M main
    Write-Host "Branch local renomeada: $localBranch -> main"
  }
}

if (-not $Branch) {
  $Branch = (git branch --show-current).Trim()
}

Write-Host "Branch alvo: $Branch"
git remote -v

if (-not $Push) {
  Write-Host ""
  Write-Host "Dry-run OK. Para enviar:" -ForegroundColor Green
  Write-Host "  .\scripts\push-prep.ps1 -RemoteUrl `"$RemoteUrl`" -Push$(if ($UseMain) { ' -UseMain' })"
  exit 0
}

git push -u origin $Branch
if ($LASTEXITCODE -ne 0) {
  Write-Error "git push falhou (exit $LASTEXITCODE)."
}

Write-Host ""
Write-Host "Push concluído." -ForegroundColor Green
Write-Host "Repo:    $($RemoteUrl -replace '\.git$','')"
Write-Host "Branch:  $Branch"
Write-Host "Commit:  $(git log -1 --oneline)"
