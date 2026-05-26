# Runbook Enterprise Local/Staging

## Ciclo operacional seguro

1. Diagnosticar:
   - `git status --short`
   - `npm run typecheck`
2. Executar batch local coerente.
3. Validar:
   - `npx tsc --noEmit`
   - `npm run validar:enterprise`
   - `npm run build` quando houver mudanca estrutural.
   - `npm run audit:anexos` quando houver mudanca documental/storage.
   - `npm run verify:proposta-anexos` quando houver mudanca em anexos de propostas.
4. Smoke local quando alterar publico/admin:
   - Terminal 1: `npm run dev`
   - Terminal 2: `npm run smoke:site`
5. Commitar localmente se o batch estiver verde e sem alteracao destrutiva.

## Ambiente

- Copiar `.env.local.example` para `.env.local` apenas no ambiente local/staging.
- Nunca versionar `.env`, `.env.*` reais ou service role.
- Variaveis esperadas:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` somente server-side/local seguro.

## Comandos principais

- TypeScript: `npm run typecheck`
- Validacao enterprise: `npm run validar:enterprise`
- Audit de anexos publicos: `npm run audit:anexos`
- Verificacao de anexos de propostas: `npm run verify:proposta-anexos`
- Build: `npm run build`
- Smoke HTTP: `SMOKE_BASE_URL=http://localhost:3000 npm run smoke:site`

## Ultimo baseline local validado

- `npx tsc --noEmit`
- `npm run validar:enterprise`
- `npm run build`
- `npm run smoke:site` com servidor local em `http://localhost:3000`
- Resultado: typecheck, audit npm, audit de anexos, build e smoke HTTP verdes.

## Politica de parada

Parar e reportar opcoes quando a proxima acao exigir producao, deploy, push, Supabase Dashboard, SQL destrutivo, remocao de dados, DROP, remocao de legado ou decisao funcional de produto.
