# Runbook Enterprise Local/Staging

## Escopo permitido

Trabalho autonomo somente em local/staging. Nao executar push, deploy, producao, Supabase Dashboard, SQL destrutivo ou remocao de dados sem autorizacao explicita.

## Validacao por ciclo

Executar a partir de `public_site`:

```bash
git status --short
npx tsc --noEmit
npm run validar:enterprise
```

Quando houver mudanca estrutural critica:

```bash
npm run build
```

Quando houver mudanca em documental/storage/anexos:

```bash
npm run audit:anexos
npm run verify:proposta-anexos
```

Quando houver mudanca em paginas publicas/admin, subir servidor local e executar:

```bash
npm run dev
npm run smoke:site
npm run smoke:admin
npm run health:local
```

## Scripts operacionais

- `npm run typecheck`: TypeScript sem emissao.
- `npm run validar:enterprise`: preflight de scripts/envs, typecheck, audit e checks documentais.
- `npm run audit:anexos`: verifica anexos versionados em `public/docs`, se existirem.
- `npm run verify:proposta-anexos`: valida marcadores do fluxo de anexos de propostas.
- `npm run health:local`: consulta `/api/health` em `LOCAL_BASE_URL` ou `http://localhost:3000`.
- `npm run smoke:site`: crawl HTTP basico do site local.
- `npm run smoke:admin`: confirma redirect protegido de `/admin` para `/login`.

O smoke publico usa seeds reais do app (`/`, `/quem-somos`, `/projetos`, `/editais`, `/propostas`, `/transparencia`, `/contato`, `/acoes`) e valida links/assets internos por HTTP.

## Autenticacao admin local/staging

- O login deve ser feito via `POST /api/admin/login`.
- A API grava `sb-access-token` e `sb-refresh-token` como cookies HTTP-only.
- O acesso a `/admin/:path*` e protegido por `proxy.ts`.
- O logout deve ser feito via `POST /api/admin/logout`, que expira os cookies.

## Higiene de Git

- Commitar apenas codigo, scripts, package metadata e documentacao.
- Nao versionar `node_modules` ou arquivos `.env` reais.
- Se `next build/dev` alterar `next-env.d.ts` apenas com referencias geradas, remover o churn antes do commit.
