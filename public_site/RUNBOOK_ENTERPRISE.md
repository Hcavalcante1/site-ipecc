# Runbook enterprise local/staging

## Validacao obrigatoria por ciclo seguro

```bash
git status --short
npx tsc --noEmit
npm run validar:enterprise
```

Quando houver alteracoes em anexos, storage ou propostas:

```bash
npm run audit:anexos
npm run verify:proposta-anexos
```

Quando houver alteracoes estruturais ou paginas publicas/admin:

```bash
npm run build
```

Para smoke local, iniciar o servidor em outra sessao e executar:

```bash
npm run smoke:site
npm run smoke:admin
npm run health:local
```

`health:local` consulta `GET /api/health` em `LOCAL_BASE_URL` ou `http://localhost:3000`.

## Guardrails

- Nao versionar `.env.local` real.
- Nao fazer push/deploy/producao neste modo sem autorizacao explicita.
- Nao executar `DROP`, apagar dados, remover colunas legadas ou alterar RLS critica sem SQL revisado.
- Preferir batches pequenos, validados e com commit local claro.

## Autenticacao admin local

- `/login` envia credenciais para `/api/admin/login`.
- `/api/admin/login` autentica no Supabase e grava cookies HTTP-only `sb-access-token` e `sb-refresh-token`.
- `proxy.ts` protege `/admin/:path*` exigindo pelo menos um desses cookies.
- Logout deve chamar `/api/admin/logout` para expirar ambos os cookies antes de voltar para `/login`.
