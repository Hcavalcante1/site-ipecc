# Runbook enterprise local/staging

Este runbook registra a operacao segura do projeto APECC/IPECC em ambiente local/staging.

## Guardrails

- Nao executar deploy nem publicar em producao durante automacoes locais.
- Nao executar `DROP`, apagar dados, remover colunas legadas ou alterar RLS critica sem SQL revisado.
- Nao versionar `.env`, `.env.local` ou variantes reais de ambiente.
- Manter fallbacks hibridos e compatibilidade publica ate decisao funcional explicita.

## Ciclo operacional

1. Diagnosticar: `git status --short`.
2. Validar base: `npm run typecheck`.
3. Validar pacote enterprise: `npm run validar:enterprise`.
4. Se mexer em documental/storage: `npm run audit:anexos`.
5. Se mexer em propostas/anexos: `npm run verify:proposta-anexos`.
6. Se mexer em estrutura critica: `npm run build`.
7. Se mexer em paginas publicas/admin: rodar smoke local com `npm run dev` e `npm run smoke:site`/`npm run smoke:admin`.

## Scripts locais

- `npm run typecheck`: TypeScript sem emitir arquivos.
- `npm run validar:enterprise`: scripts obrigatorios, envs reais fora do Git, typecheck, audit e checks locais.
- `npm run audit:anexos`: varredura local de extensoes permitidas e arquivos vazios em diretorios documentais publicos.
- `npm run verify:proposta-anexos`: invariantes estaticas do fluxo de propostas e anexos.
- `npm run check:site`: crawler local estatico/HTTP.

## Estado atual

- Primeiro batch reforcou higiene de segredos, scripts de validacao e documentacao operacional.
- `.env.local` e `app/admin/.env.local` devem existir apenas localmente, nunca rastreados.
