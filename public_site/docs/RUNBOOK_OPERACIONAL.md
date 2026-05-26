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

## Ciclo 2026-05-26 06:00 UTC - validadores enterprise locais

Escopo:
- Adicionar scripts npm para typecheck, smoke estatico, auditoria de anexos e
  verificacao de anexos de propostas.
- Validar links locais para `public/docs`.
- Garantir que a tela admin de detalhe de proposta exponha proposta, estatuto
  social e CNPJ quando enviados.

Validacoes planejadas:
- `git status --short`
- `npm run validar:enterprise`
- `npm run build`

Resultado:
- Auditoria local detecta placeholders vazios em `public/docs` como aviso.
- Use `STRICT_ANEXOS=1 npm run audit:anexos` para transformar placeholders
  vazios em erro duro quando houver pacote documental oficial.
