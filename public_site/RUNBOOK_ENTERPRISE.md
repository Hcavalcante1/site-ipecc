# Runbook enterprise local/staging

## Setup local

1. Copie `.env.local.example` para `.env.local`.
2. Preencha apenas variaveis de staging/local.
3. Instale dependencias:

```bash
npm install
```

## Validacao por ciclo

Execute em `public_site`:

```bash
git status --short
npm run typecheck
npm run validar:enterprise
npm run build
```

Quando mexer em documental/storage/anexos:

```bash
npm run audit:anexos
npm run verify:proposta-anexos
```

Quando mexer em paginas publicas/admin, rode smoke local:

```bash
npm run dev
npm run smoke:site
```

## Regras operacionais

- Nunca versionar `.env`, `.env.local` ou chaves reais.
- Nao executar deploy, push, SQL destrutivo, DROP ou alteracoes de RLS critica sem revisao.
- Manter commits pequenos e coerentes por batch.
- Registrar no `ROADMAP_ENTERPRISE.md` qualquer batch concluido ou bloqueado.

## Checks implementados

- `validar:enterprise`: scripts obrigatorios, ausencia de `.env*` rastreado, typecheck, audit e checks de anexos.
- `audit:anexos`: invariantes locais do fluxo documental de propostas.
- `verify:proposta-anexos`: marcadores de upload e persistencia de anexos no formulario publico.
- `check:site`/`smoke:site`: crawler simples para rotas publicas locais.

## Compatibilidade Next 16

- A protecao de rotas admin usa `proxy.ts`.
- Se o build voltar a alertar sobre `middleware.ts`, verifique se nenhum arquivo legado com esse nome foi recriado.
- Login admin deve chamar `/api/admin/login`; logout deve chamar `/api/admin/logout`.
- Cookies esperados pela proxy local: `sb-access-token` e `sb-refresh-token`.

## Smoke visual rapido

- Em telas pequenas, o menu publico deve aparecer como botao "Menu" no topo.
- O menu desktop permanece visivel em telas medias/grandes.
- Para validar sem browser, use `npm run smoke:site`; para regressao visual, abrir `/`, `/editais` e `/propostas` no dev server.
