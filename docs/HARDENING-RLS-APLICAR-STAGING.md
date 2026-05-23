# Hardening RLS — aplicar em staging (≈5 min)

Correção do gap detectado por `npm run validar:seguranca` (anon lendo `propostas`).

## 1. Antes

```bash
npm run validar:seguranca
# Esperado hoje: FALHA — anon leu N linhas em propostas
```

## 2. Supabase Dashboard (projeto staging)

1. SQL Editor → New query
2. Colar **`docs/sql/hardening-propostas-rls-APLICAR.sql`**
3. Run

Se erro em `is_admin(auth.uid())`: abra Database → Functions → `is_admin` e ajuste o `USING` conforme a assinatura real (ex.: RPC usa `user_id`).

## 3. Depois

```bash
npm run validar:pos-hardening-rls
```

Esperado:

- `validar:seguranca` → OK (anon 0 linhas em propostas)
- `validate:upload-proposta` → insert + storage OK (anon INSERT preservado)

## 4. Smoke admin

- Login → `/admin/propostas` → listagem e detalhe OK
- Substituir anexo (se usar) → OK

## Produção

Repetir **somente** após staging OK e autorização explícita — ver `docs/PROD-PREP-CHECKLIST.md`.
