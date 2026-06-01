$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Validando .env.local (WhatsApp Meta) ..."
npm run validar:env-whatsapp-meta
if ($LASTEXITCODE -ne 0) {
  Write-Error "FALHA: preencha WHATSAPP_* em .env.local (veja docs/WHATSAPP-META-SANDBOX.md)."
  exit $LASTEXITCODE
}

Write-Host "Validando estrutura de docs/ENTERPRISE-STATUS.md ..."
npm run validar:status-fase4-whatsapp
if ($LASTEXITCODE -ne 0) {
  Write-Error "FALHA: marcadores automáticos da Fase 4 inválidos no ENTERPRISE-STATUS."
  exit $LASTEXITCODE
}

Write-Host "Executando fase4:whatsapp-meta ..."
$phaseExit = 0
try {
  npm run fase4:whatsapp-meta
  if ($LASTEXITCODE -ne 0) { $phaseExit = $LASTEXITCODE }
} catch {
  $phaseExit = 1
  Write-Warning "Falha durante fase4:whatsapp-meta"
}

Write-Host "Atualizando docs/ENTERPRISE-STATUS.md com o estado atual dos reports ..."
try {
  npm run atualizar:status-fase4-whatsapp
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Falha ao atualizar status automático."
    if ($phaseExit -eq 0) { $phaseExit = $LASTEXITCODE }
  }
} catch {
  Write-Warning "Exceção ao atualizar status automático."
  if ($phaseExit -eq 0) { $phaseExit = 1 }
}

if ($phaseExit -ne 0) {
  Write-Error "Fase 4 finalizada com falha (exit $phaseExit). Status foi atualizado com as evidências disponíveis."
  exit $phaseExit
}

Write-Host "Fase 4 concluída com sucesso e status atualizado."
