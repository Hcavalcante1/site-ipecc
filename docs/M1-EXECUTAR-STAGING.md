# M1 — Executar no Supabase staging (manual)

**Quem executa:** você, no Dashboard do projeto **staging/dev**.  
**Código do site:** não muda nesta fase.  
**SQL:** `docs/sql/proposta_anexos-M1-staging-APLICAR.sql`

---

## Antes

1. Confirmar que `.env.local` aponta para **staging** (não produção).
2. Checklist completo: `docs/M1-CHECAGEM-VERIFICACAO.md`
3. No terminal do projeto:

```bash
npx tsc --noEmit
npm run audit:anexos
```

Anote: **referências de anexo** (ex.: 22). Se a tabela já existir vazia, rode só o **PASSO 4** do SQL.

---

## No Supabase Dashboard (ou script local)

**Opção A — SQL Editor**

1. **SQL Editor** → New query.
2. Cole `docs/sql/proposta_anexos-M1-staging-APLICAR.sql` (ou só `proposta_anexos-M1-PASSO4-SOMENTE.sql` se a tabela já existir vazia).
3. **Run** (uma vez).
4. Se erro em `is_admin(auth.uid())`: ajuste PASSO 3 conforme sua função `is_admin`.

**Opção B — terminal (staging, service role)**

```bash
npm run apply:m1-anexos-insert
```

Equivalente ao PASSO 4; usa `extrairAnexosProposta` (mesma fonte do audit).

---

## Depois

```bash
npm run audit:anexos
npm run verify:proposta-anexos
```

| Esperado | |
|----------|--|
| `audit:anexos` | **0 órfãos** (igual antes) |
| `verify:proposta-anexos` | Linhas na tabela ≈ referências do audit |

Opcional no SQL Editor:

```sql
SELECT count(*) AS total FROM public.proposta_anexos;
```

---

## Rollback (só staging)

```sql
TRUNCATE public.proposta_anexos;
```

Colunas `*_url` em `propostas` **não são alteradas** pela M1.

---

## Próximo passo (após M1 OK)

**Fase M2** — leitura híbrida no código (feature flag). **Exige nova autorização** antes de alterar `lib/documental/` ou admin.
