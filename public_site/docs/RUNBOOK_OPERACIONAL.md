# Runbook operacional local/staging

Este runbook registra ciclos seguros executados no ambiente local/staging.
Nao autoriza deploy, producao, SQL destrutivo, DROP ou alteracoes manuais no
Supabase Dashboard.

## Ciclo 2026-05-26 06:00 UTC - toolchain e TypeScript admin

Escopo:
- Restaurar validacao local do TypeScript.
- Corrigir export duplicado em `app/admin/editais/documentos/page.tsx`.
- Ignorar artefatos locais de build/dependencias.
- Gerar `package-lock.json` para instalacoes reprodutiveis.

Validacoes:
- `git status --short`
- `npx tsc --noEmit`
- `npm run build`

Resultado:
- TypeScript e build de producao passaram localmente.
- Sem alteracoes em producao, deploy, SQL ou dados.
