# Hardening — RLS, storage e APIs (staging/prod)

Checklist manual + gate automatizado. **Não altera** middleware, auth nem rotas públicas.

## Gate automatizado

```bash
npm run validar:seguranca
```

Verifica (read-only):

| Check | Esperado |
|-------|----------|
| `NEXT_PUBLIC_*` sem service role | OK |
| Anon `SELECT` em `propostas` | Erro ou 0 linhas |
| Anon `SELECT` em `proposta_anexos` | Erro ou 0 linhas |
| Anon `SELECT` em `admin_logs` | Erro ou 0 linhas |
| URL pública storage `propostas/{path}` | **Não** 200 |
| `GET /api/download/.../propostas/...` sem cookie | **401/403** (se dev ativo) |

Com dev: `DEV_URL=http://localhost:3002 npm run validar:seguranca`

**Correção se anon lê `propostas`:** aplicar `docs/sql/hardening-propostas-rls-APLICAR.sql` — guia `docs/HARDENING-RLS-APLICAR-STAGING.md` → `npm run validar:pos-hardening-rls`.

---

## Dashboard Supabase — revisão manual

### Storage

- [ ] Bucket `propostas`: **Private**
- [ ] Sem policy de SELECT para `anon` / `authenticated` em `storage.objects`
- [ ] INSERT anon permitido apenas se fluxo público `/propostas` exigir (validar com `validate:upload-proposta`)

### Tabelas (RLS)

| Tabela | Anon | Authenticated admin |
|--------|------|---------------------|
| `propostas` | INSERT (envio); SELECT negado | SELECT/UPDATE/DELETE via `is_admin()` |
| `proposta_anexos` | Negado | Admin via `is_admin()` |
| `admin_logs` | Negado | Admin |
| `certidoes` | Negado | Admin |

SQL de referência: `docs/sql/proposta_anexos-M1-staging-APLICAR.sql` (PASSO 3), `docs/fase1-seguranca-supabase.md`

### Funções

- [ ] `public.is_admin(uuid)` retorna `true` só para perfis admin ativos

---

## Código (já implementado — não regredir)

| Controle | Onde |
|----------|------|
| Download `propostas` admin-only | `lib/downloadAuth.ts`, `/api/download` |
| `/admin/*` protegido | `middleware.ts` |
| Email `tipo: admin` exige sessão | `app/api/email/route.ts` |
| Service role só server/scripts | `lib/supabaseAdmin.ts` |

---

## Antes de produção

1. `npm run validar:seguranca` no projeto **correto** (`.env`)
2. `docs/fase1-seguranca-supabase.md` no Supabase prod
3. `docs/PROD-PREP-CHECKLIST.md` — seção 2 e 6

---

## Fora deste hardening (Fase 10)

- Pentest externo
- Backup/DR testado
- Rotação programada de chaves
- Signed URLs com TTL
