# Correção operacional — anexos órfãos (Bloco A)

Gerado a partir de `npm run audit:anexos` em 2026-05-22. **Última revalidação:** 2026-05-22 — **0 órfãos** (staging validado).

**Resumo:** 9 propostas · 20 referências · **0 órfãos**.

Não altera código. Ações no **Supabase Dashboard** (Storage + Table Editor `propostas`).

---

## Órfãos atuais

Nenhum (`npm run audit:anexos` em staging local, 2026-05-22).

### Histórico resolvido

| Item | Resolução |
|------|-----------|
| `9e265fc7-…` (teste) | `arquivo_url` limpo (arquivo inexistente) — script `scripts/limpar-orfao-proposta-teste.ts` |
| `e8b0b8b8-…` (3 paths `propostas/public/`) | Resolvido no código via `candidatosPathProposta` (arquivos em `public/…`) |

### Resolvidos automaticamente (paths `propostas/public/`)

A proposta `e8b0b8b8-94c8-4104-930d-e11233221b50` deixou de aparecer como órfã após ampliar `candidatosPathProposta` (arquivos existem sob `public/...` no bucket). Opcional: normalizar colunas no banco via `docs/sql/correcao-orfaos-propostas.sql`.

**Nota:** Arquivos antigos podem estar sob `public/` no bucket (ex. proposta `1d3f7270-…` resolve com `public/...`). O download admin já tenta candidatos de path; órfãos são paths que não existem em nenhuma variante.

---

## Procedimento (por linha órfã)

1. Storage → bucket `propostas` → buscar por nome de arquivo (sem prefixo `propostas/public/` se aplicável).
2. Se o arquivo existir em outro path: atualizar a coluna `*_url` na linha da proposta para o path real.
3. Se não existir: solicitar reenvio ao proponente **ou** anexar manualmente no path registrado no banco **ou** limpar a coluna (proposta fica sem aquele documento; admin já oculta link órfão).
4. Rodar de novo: `npm run audit:anexos` → meta **0 órfãos** (ou exceções documentadas).
5. Conferir `/admin/propostas/auditoria` e detalhe da proposta corrigida.

---

## Critério de aceite (Bloco A)

- [ ] CSV / auditoria: 0 órfãos (ou lista de exceções acordada, ex. só rascunhos de teste removidos)
- [ ] Download admin OK nas propostas corrigidas
- [ ] Nenhuma mudança em auth, middleware ou layout

---

## SQL de referência (Dashboard)

Modelos comentados de `SELECT` / `UPDATE` por proposta: [`docs/sql/correcao-orfaos-propostas.sql`](sql/correcao-orfaos-propostas.sql).

**Nota código:** paths `propostas/public/...` no banco passam a ser resolvidos também como `public/...` e nome na raiz (`candidatosPathProposta`). Se o arquivo existir no Storage sob `public/`, a auditoria pode deixar de marcar órfão **sem** UPDATE — confira com `npm run audit:anexos` após deploy.

---

## Referências

- Script: `npm run audit:anexos` → `reports/auditoria-anexos-YYYY-MM-DD.csv`
- UI: `/admin/propostas/auditoria`
- Runbook completo: `docs/runbook-staging-enterprise.md`
- Checklist segurança: `docs/fase1-seguranca-supabase.md`
- Upload: `docs/fase3-validacao-upload-propostas.md`
