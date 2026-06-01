# Enterprise Guard LOCAL

Automação de **engenharia do site** rodando na sua máquina — sem Cursor Automations na nuvem.

## Comandos

```bash
# Gate completo (typecheck, status Fase 4, público, admin, segurança, release, M4, órfãos, build opcional)
npm run guard:enterprise

# Gate completo + execução automatizada da Fase 4 (Meta sandbox)
npm run validar:enterprise:fase4

# Mais rápido (sem build)
npm run guard:enterprise -- --no-build

# Guard local com Fase 4 (via argumento)
npm run guard:enterprise -- --include-fase4

# Check diário de operação (estrutura + agendamento + diagnóstico)
npm run check:enterprise-operacao

# Prontidão enterprise (ops + DoD parcial Fase 4 + tentativa DoD completo se .env OK)
npm run validar:enterprise-readiness

# Fase 4 sem credenciais Meta (dev ativo)
npm run fase4:whatsapp-meta:parcial
```

PowerShell:

```powershell
.\scripts\enterprise-guard-local.ps1
.\scripts\enterprise-guard-local.ps1 -NoBuild
.\scripts\enterprise-guard-local.ps1 -IncludeFase4
.\scripts\enterprise-guard-local.ps1 -NoBuild -IncludeFase4
```

## Relatórios

- Pasta: `reports/` (já no `.gitignore`)
- Log com data: `reports/enterprise-guard-YYYY-MM-DD_HHMMSS.log`
- Último resultado: `reports/enterprise-guard-last.txt`

## Agendar diário (08:00)

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\agendar-enterprise-guard.ps1
# variante com Fase 4:
.\scripts\agendar-enterprise-guard.ps1 -IncludeFase4
# verificar tarefas agendadas:
.\scripts\verificar-enterprise-guard-agendamento.ps1
# diagnóstico operacional consolidado:
.\scripts\diagnostico-enterprise-operacao.ps1
```

Remover agendamento:

```powershell
.\scripts\agendar-enterprise-guard.ps1 -Remover
# remover tarefa Fase 4:
.\scripts\agendar-enterprise-guard.ps1 -Remover -IncludeFase4
# remover ambas as tarefas:
.\scripts\agendar-enterprise-guard.ps1 -RemoverTodos
```

## O que executa

Encadeia `npm run validar:enterprise` (mesmo gate já usado no staging), incluindo:

- check estrutural de `docs/ENTERPRISE-STATUS.md` para Fase 4 (`validar:status-fase4-whatsapp`)
- diagnóstico de prontidão da Fase 4 (`diagnostico:fase4-whatsapp-meta`) como passo opcional (aviso)
- no modo estendido (`validar:enterprise:fase4`), também roda `fase4:whatsapp-meta:status`

Não altera código, Supabase nem faz deploy.

## Lock

Se outro guard estiver rodando, aparece `reports/.enterprise-guard.lock`. Se travou, apague o arquivo manualmente.
