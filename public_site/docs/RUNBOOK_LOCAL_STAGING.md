# Runbook local/staging

## Escopo seguro

- Executar validacoes locais, build e smoke tests sem acionar producao.
- Usar somente variaveis `.env.local` locais/staging.
- Nao executar deploy, push, DROP, remocao de dados ou alteracao destrutiva.

## Validacao padrao por batch

```bash
git status --short
npx tsc --noEmit
npm run validar:enterprise
npm run build
npm run smoke:local
```

## Preflight de release local

```bash
npm run preflight:release
npm run smoke:local
```

O preflight nao publica, nao faz push e nao acessa producao. Ele agrega typecheck,
validacao enterprise, auditoria local de anexos e build.

## Validacoes condicionais

- Ao mexer em documental/storage: `npm run audit:anexos`
- Ao mexer em anexos de propostas: `npm run verify:proposta-anexos`
- Ao mexer em paginas publicas/admin: executar `npm run smoke:local` com o servidor local ativo.

## Estado operacional atual

- `validar:enterprise` executa a checagem TypeScript do projeto.
- `smoke:local` verifica rotas publicas principais e aceita redirect controlado do `/admin`.
- `audit:anexos` executa a verificacao local do contrato de anexos de propostas.
- `verify:proposta-anexos` garante validacao local de PDF, limite de tamanho e bucket esperado.
- `preflight:release` agrega as validacoes locais antes de qualquer preparacao de release.
