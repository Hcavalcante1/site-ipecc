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

## Validacoes condicionais

- Ao mexer em documental/storage: `npm run audit:anexos`
- Ao mexer em anexos de propostas: `npm run verify:proposta-anexos`
- Ao mexer em paginas publicas/admin: executar `npm run smoke:local` com o servidor local ativo.

## Estado operacional atual

- `validar:enterprise` executa a checagem TypeScript do projeto.
- `smoke:local` verifica rotas publicas principais e aceita redirect controlado do `/admin`.
- `audit:anexos` usa o crawler estatico existente contra `./out`; requer export estatico disponivel antes da execucao.
- `verify:proposta-anexos` esta ligado ao typecheck ate existir uma suite dedicada de anexos.
