# Enterprise Guard LOCAL

Automação de **engenharia do site** rodando na sua máquina — sem Cursor Automations na nuvem.

## Comandos

```bash
# Gate completo (typecheck, público, admin, segurança, release, M4, órfãos, build opcional)
npm run guard:enterprise

# Mais rápido (sem build)
npm run guard:enterprise -- --no-build
```

PowerShell:

```powershell
.\scripts\enterprise-guard-local.ps1
.\scripts\enterprise-guard-local.ps1 -NoBuild
```

## Relatórios

- Pasta: `reports/` (já no `.gitignore`)
- Log com data: `reports/enterprise-guard-YYYY-MM-DD_HHMMSS.log`
- Último resultado: `reports/enterprise-guard-last.txt`

## Agendar diário (08:00)

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\agendar-enterprise-guard.ps1
```

Remover agendamento:

```powershell
.\scripts\agendar-enterprise-guard.ps1 -Remover
```

## O que executa

Encadeia `npm run validar:enterprise` (mesmo gate já usado no staging).

Não altera código, Supabase nem faz deploy.

## Lock

Se outro guard estiver rodando, aparece `reports/.enterprise-guard.lock`. Se travou, apague o arquivo manualmente.
