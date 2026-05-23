# M1 — Desbloqueio imediato (você no Dashboard)

**Bloqueio atual:** `proposta_anexos` não existe no projeto do `.env.local`.

Este passo **não altera código** do site. Só o banco **staging**.

---

## 1. Confirmar projeto

```bash
npm run diag:supabase-env
```

No [Supabase Dashboard](https://supabase.com/dashboard), abra o projeto com o **mesmo ref** exibido.

---

## 2. Executar SQL (uma vez)

1. SQL Editor → **New query**
2. Abra no repo: `docs/sql/proposta_anexos-M1-staging-APLICAR.sql`
3. Copie **tudo** → Cole → **Run**
4. Deve terminar sem erro vermelho

Se erro em `is_admin`: Database → Functions → veja o nome/parâmetros e ajuste só o bloco RLS (PASSO 3 do arquivo).

---

## 3. Validar no terminal

```bash
npm run apply:m1-anexos-insert
npm run verify:proposta-anexos
npm run audit:anexos
```

| Comando | Sucesso |
|---------|---------|
| `apply:m1-anexos-insert` | `OK: inseridas 22 linhas` (aprox.) |
| `verify:proposta-anexos` | `OK: M1 consistente` |
| `audit:anexos` | `Órfãos: 0` |

---

## 4. Avisar no chat

Escreva **M1 OK** com a saída do `verify` para fecharmos o checklist e seguir (M2 só com nova autorização).

---

## Rollback staging

```sql
TRUNCATE public.proposta_anexos;
DROP TABLE IF EXISTS public.proposta_anexos CASCADE;
```

Colunas `*_url` em `propostas` **não são removidas**.
