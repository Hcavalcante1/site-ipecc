# M1 — Checagem e verificação (passo a passo)

Atualizado conforme rodadas locais. **Sem alteração de código** neste documento.

---

## Legenda

- [x] Concluído
- [ ] Pendente (você no Dashboard)
- ⏳ Aguardando passo anterior

---

## Bloco A — Pré-requisitos locais

| # | Checagem | Comando / ação | Esperado | Status |
|---|----------|----------------|----------|--------|
| A1 | TypeScript | `npx tsc --noEmit` | Sem erros | [x] |
| A2 | Integridade anexos | `npm run audit:anexos` | 0 órfãos | [x] 11 propostas, 22 refs |
| A3 | Dev único | Um `npm run dev` | URL no terminal | [x] usar **3001** |
| A4 | Health API | `curl http://localhost:3001/api/health` | `"status":"ok"` | [x] |
| A5 | Admin propostas | Browser `/admin/propostas` logado | Listagem com cards | [x] (após dev limpo) |
| A6 | `.env.local` | Conferir projeto Supabase | **Staging**, não produção | [ ] você confirma |

---

## Bloco B — SQL no Supabase staging

| # | Passo | SQL / ação | Esperado | Status |
|---|-------|------------|----------|--------|
| B1 | Tabela + índices | PASSO 1–2 em `proposta_anexos-M1-staging-APLICAR.sql` | API vê a tabela | [ ] **pendente** (erro schema cache) |
| B2 | RLS admin | PASSO 3 | Sem erro no Run | [ ] junto com B1 |
| B3 | Migração legado | PASSO 4 ou `npm run apply:m1-anexos-insert` | ~22 linhas | [ ] após B1 |
| B4 | Contagem SQL | `SELECT count(*) FROM proposta_anexos;` | ≈ 22 | [ ] após B3 |

---

## Bloco C — Pós-SQL (terminal)

| # | Checagem | Comando | Esperado | Status |
|---|----------|---------|----------|--------|
| C1 | Órfãos | `npm run audit:anexos` | 0 órfãos | [x] (antes do INSERT) |
| C2 | Paridade tabela × audit | `npm run verify:proposta-anexos` | OK, linhas ≈ 22 | [ ] falhou: **0 linhas** (rodar B3) |
| C3 | Órfãos de novo | `npm run audit:anexos` | 0 órfãos | ⏳ após B3 |

---

## Situação atual (resumo)

```
audit:anexos     → OK (0 órfãos, 22 referências)
proposta_anexos  → tabela ainda NÃO visível na API → rodar SQL PASSOS 1–3 no Dashboard staging
verify           → aguardando B1
apply:m1-anexos  → aguardando B1 (depois B3)
```

---

## Se PASSO 4 falhar

- Conferir políticas RLS em `propostas` (SELECT para service role no script de audit já funciona).
- Conferir nomes de colunas `*_url` na tabela `propostas`.
- Rollback: `TRUNCATE public.proposta_anexos;` e corrigir SQL.

---

## Após M1 fechado (C2 = OK)

Próxima fase: **M2 leitura híbrida** — **exige autorização** para alterar `lib/documental/` e admin.

Guia de execução: `docs/M1-EXECUTAR-STAGING.md`
