# Passo 1 — preparar push (sem enviar segredos).
# Uso:
#   $env:GITHUB_REPO_URL = "https://github.com/SEU_USUARIO/ipecc-public-site.git"
#   .\scripts\preparar-github-push.ps1
#   .\scripts\preparar-github-push.ps1 -Push

param(
  [switch]$Push
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== Preparar push GitHub (master) ===" -ForegroundColor Cyan

$blocked = @(".env.local", ".env", ".cursor", "reports")
$status = git status --porcelain
$staged = git diff --cached --name-only

foreach ($name in $staged) {
  foreach ($b in $blocked) {
    if ($name -like "*$b*") {
      Write-Error "BLOQUEADO: '$name' está no stage. Remova antes do push."
    }
  }
}

if (-not $env:GITHUB_REPO_URL) {
  Write-Host ""
  Write-Host "Defina o repositório vazio no GitHub e exporte a URL:" -ForegroundColor Yellow
  Write-Host '  $env:GITHUB_REPO_URL = "https://github.com/SEU_USUARIO/ipecc-public-site.git"'
  Write-Host ""
  Write-Host "Criar repo: GitHub → New repository → vazio → copiar HTTPS."
  Write-Host "Depois rode de novo com -Push para enviar."
  Write-Host ""
  git status -sb
  git log -3 --oneline
  exit 0
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
  git remote add origin $env:GITHUB_REPO_URL
  Write-Host "Remote origin adicionado: $env:GITHUB_REPO_URL"
} else {
  Write-Host "Remote origin já existe: $remote"
}

if (-not $Push) {
  Write-Host ""
  Write-Host "Pronto. Para enviar:" -ForegroundColor Green
  Write-Host "  .\scripts\preparar-github-push.ps1 -Push"
  exit 0
}

git push -u origin master
Write-Host "Push concluído. Verifique Actions no GitHub." -ForegroundColor Green
