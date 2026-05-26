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

Smoke local:
- `npm run check:http` deve ser executado com `npm run dev` ativo.
- Ajustado para rotas publicas atuais e atributos HTML com entidades
  (`&amp;`) geradas pelo Next/Image.
- Reinicie `npm run dev` apos `npm run build` antes de repetir smoke HTTP,
  pois o build regenera artefatos em `.next`.

## Ciclo 2026-05-26 06:00 UTC - hardening de dependencia Next

Escopo:
- Atualizar Next.js da linha `14.2.5` para `14.2.35` no site principal.
- Sincronizar o `package.json` do admin standalone para a mesma linha 14.x.
- Atualizar Firebase para `12.13.0`; nao ha imports Firebase no codigo atual,
  reduzindo risco de runtime no site.
- Manter React 18 e evitar salto major de framework.

Validacoes planejadas:
- `git status --short`
- `npm run validar:enterprise`
- `npm run build`
- `npm run check:http` com servidor local reiniciado

Nota de seguranca:
- `npm audit --omit=dev` ainda aponta vulnerabilidades associadas a Next/PostCSS
  cuja correcao sugerida exige salto para Next 16.x. Esse salto e tratado como
  decisao funcional/arquitetural, nao aplicado automaticamente neste ciclo.

Resultado:
- Auditoria local detecta placeholders vazios em `public/docs` como aviso.
- Use `STRICT_ANEXOS=1 npm run audit:anexos` para transformar placeholders
  vazios em erro duro quando houver pacote documental oficial.

## Ciclo 2026-05-26 06:00 UTC - responsividade do cabecalho publico

Escopo:
- Adicionar link de salto para o conteudo principal.
- Ajustar logo/menu do cabecalho para telas pequenas.
- Reduzir risco de overflow horizontal no menu principal mobile.

Validacoes planejadas:
- `git status --short`
- `npm run validar:enterprise`
- `npm run build`
