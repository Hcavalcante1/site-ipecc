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
```

## Validacoes condicionais

- Ao mexer em documental/storage: `npm run audit:anexos`
- Ao mexer em anexos de propostas: `npm run verify:proposta-anexos`
- Ao mexer em paginas publicas/admin: executar smoke local na rota afetada.

## Estado operacional atual

- `validar:enterprise` executa a checagem TypeScript do projeto.
- `audit:anexos` usa o crawler estatico existente contra `./out`; requer export estatico disponivel antes da execucao.
- `verify:proposta-anexos` esta ligado ao typecheck ate existir uma suite dedicada de anexos.
