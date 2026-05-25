# Runbook enterprise local/staging

## Ciclo operacional

1. Verificar estado: `git status --short`.
2. Validar tipos: `npx tsc --noEmit`.
3. Validar anexos quando houver mudanca documental:
   - `npm run audit:anexos`
   - `npm run verify:proposta-anexos`
4. Validar build e gate enterprise: `npm run validar:enterprise`.
5. Executar smoke HTTP local quando paginas publicas/admin forem alteradas:
   - iniciar `npm run dev`
   - rodar `npm run check:http`

## Estado atual local/staging

- Dependencias do site atualizadas para Next/React/Firebase atuais.
- `node_modules` deve permanecer fora do versionamento; `package-lock.json` e o `package.json` sao a fonte reproduzivel.
- Anexos em `public/docs` que estavam vazios foram substituidos por placeholders validos e explicitamente marcados como local/staging.
- Antes de release/publicacao, substitua placeholders documentais pelos arquivos oficiais revisados.

## Observabilidade de validacao

- `npm audit --audit-level=high` deve passar sem high/critical.
- O audit moderado conhecido vem de `postcss` transitivo do Next atual; acompanhar patch upstream antes de release.
- Next 16 gera tipos em `.next/types`; se um clone limpo falhar no `npx tsc --noEmit` antes do primeiro build, execute `npm run build` ou `next typegen` para gerar tipos locais.
