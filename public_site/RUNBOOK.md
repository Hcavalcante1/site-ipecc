# Runbook operacional local/staging

Este projeto deve ser operado localmente antes de qualquer acao externa.

## Ciclo seguro

1. Diagnosticar com `git status --short`.
2. Validar tipos com `npm run typecheck`.
3. Executar `npm run validar:enterprise`.
4. Quando houver mudanca documental/storage, executar `npm run audit:anexos`.
5. Quando houver mudanca em anexos de propostas, executar `npm run verify:proposta-anexos`.
6. Para mudancas estruturais, executar `npm run build`.
7. Para smoke HTTP local, subir `npm run start -- -p 3050` apos build e executar `npm run smoke:local`.
8. Commitar somente batches coesos e validados.

## Limites operacionais

- Nao atuar em producao sem revisao explicita.
- Nao executar SQL destrutivo, DROP ou remocao de dados.
- Nao remover fallback hibrido, colunas legadas ou chaves reais.
- Manter alteracoes em local/staging ate revisao de release.

## Observabilidade local

- `validar:enterprise` cobre presenca de rotas publicas, admin minimo, scripts e documentos essenciais.
- `audit:deps` bloqueia vulnerabilidades com correcao semver-minor/patch disponivel e avisa sobre upgrades major.
- `audit:anexos` verifica anexos versionados em `public/docs`.
- `verify:proposta-anexos` verifica o fluxo basico de envio/listagem de anexos de propostas.
- `smoke:local` verifica rotas publicas principais e protecao por redirect das rotas admin.

## Seguranca de dependencias

- Executar `npm run audit:deps` em ciclos de release local.
- Correcoes semver-minor/patch podem ser aplicadas quando `typecheck`, `validar:enterprise` e `build` passarem.
- Upgrades major de framework (por exemplo Next ou Firebase) exigem branch/batch dedicado, smoke ampliado e decisao de release.
