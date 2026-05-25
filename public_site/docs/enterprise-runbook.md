# Runbook operacional enterprise

## Escopo local/staging

Este repositório opera em modo seguro local/staging. Ações de produção, deploy,
push, Supabase Dashboard, SQL destrutivo, `DROP` e remoção de dados permanecem
bloqueadas sem autorização explícita.

## Validação por ciclo

Executar antes de commit de batches seguros:

```bash
git status --short
npx tsc --noEmit
npm run validar:enterprise
```

Validações adicionais por escopo:

- Documental/storage: `npm run audit:anexos` quando o script existir.
- Propostas/anexos: `npm run verify:proposta-anexos` quando o script existir.
- Estrutura crítica: `npm run build`.
- Páginas públicas/admin: smoke local com `npm run smoke:site` após subir o app.

## Estado validado

- TypeScript passa com `npx tsc --noEmit`.
- `npm run validar:enterprise` aponta para o typecheck enterprise mínimo.
- O admin de documentos de editais não possui mais export default duplicado.
- Artefatos locais (`node_modules`, `.next`, `tsconfig.tsbuildinfo`) estão
  cobertos pelo `.gitignore` para próximos ciclos.

## Bloqueios conhecidos

- `npm audit` reporta vulnerabilidades nas versões atuais de dependências,
  incluindo `next@14.2.5`. Atualizacao de framework deve ser um batch dedicado,
  com build e smoke completos.
- Scripts `audit:anexos` e `verify:proposta-anexos` ainda nao existem; criar
  antes de validar anexos/documental em profundidade.
