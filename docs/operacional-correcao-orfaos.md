# Correção operacional — anexos órfãos (Bloco A)

Gerado a partir de `npm run audit:anexos` em 2026-05-22.

**Resumo:** 8 propostas · 20 referências · **4 órfãos** (sem arquivo no bucket `propostas`).

Não altera código. Ações no **Supabase Dashboard** (Storage + Table Editor `propostas`).

---

## Órfãos atuais

| Proposta ID | Nome / contexto | Coluna | Path no banco | Ação sugerida |
|-------------|-----------------|--------|---------------|---------------|
| `9e265fc7-3cca-4b51-8a20-e5e13ac8be73` | Teste validacao | `arquivo_url` | `1779231619365-proposta-teste-validacao.pdf` | Proposta de teste: **reupload** do PDF no path acima **ou** limpar `arquivo_url` e arquivar/excluir proposta |
| `e8b0b8b8-94c8-4104-930d-e11233221b50` | asap | `arquivo_url` | `propostas/public/1774299374293-proposta-3964-05.pdf` | Path legado com prefixo errado: reupload como `1774299374293-proposta-3964-05.pdf` (sem `propostas/public/`) **ou** atualizar coluna para path que exista no storage |
| `e8b0b8b8-94c8-4104-930d-e11233221b50` | asap | `cnpj_url` | `propostas/public/1774299377009-cnpj-3964-05.pdf` | Idem |
| `e8b0b8b8-94c8-4104-930d-e11233221b50` | asap | `estatuto_url` | `propostas/public/1774299376006-estatuto-3964-05.pdf` | Idem |

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

## Referências

- Script: `npm run audit:anexos` → `reports/auditoria-anexos-YYYY-MM-DD.csv`
- UI: `/admin/propostas/auditoria`
- Checklist segurança: `docs/fase1-seguranca-supabase.md`
