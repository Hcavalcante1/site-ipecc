# Runbook — validação staging (MVP enterprise)

Ordem única para fechar Fase 1 (Dashboard), Fase 3 (upload) e Bloco A (órfãos).

## Pré-requisitos

- `.env.local` com URLs/chaves válidas
- Admin de teste com `is_admin`
- Bucket `propostas` **privado**

---

## A. Supabase Dashboard (≈30 min)

1. [ ] `docs/fase1-seguranca-supabase.md` — RLS + storage (sem SELECT público em `propostas`)
2. [ ] Política **INSERT** no bucket `propostas` para envio anônimo
3. [ ] Política **INSERT** na tabela `propostas` para envio público
4. [ ] Órfãos: `docs/operacional-correcao-orfaos.md` + `docs/sql/correcao-orfaos-propostas.sql`

---

## B. Comandos locais

```bash
npx tsc --noEmit
npm run audit:anexos
```

- [ ] `tsc` sem erros
- [ ] `audit:anexos` → **0 órfãos** (ou exceções documentadas)

---

## C. Smoke no navegador

| # | Teste | Esperado |
|---|--------|----------|
| 1 | `/propostas` — envio com PDF teste | Sucesso; linha no banco; arquivo no Storage |
| 2 | `/admin/propostas` — nova proposta na lista | Visível |
| 3 | Detalhe admin — download anexo | 200 via `/api/download` |
| 4 | Download sem login (URL API propostas) | 401/403 |
| 5 | `/admin/propostas/auditoria` | Sem órfãos nas ativas |
| 6 | `/editais`, `/projetos`, `/quem-somos` | Carregam (supabasePublic) |

Detalhe upload: `docs/fase3-validacao-upload-propostas.md`

---

## D. Critério “MVP enterprise” no código

| Critério | Status após runbook |
|----------|---------------------|
| Fase 1 staging validada | [ ] |
| Órfãos zerados ou exceção documentada | [ ] |
| Clients canônicos (sem inline em páginas) | [x] código |
| `audit:anexos` no processo | [x] |
| `tsc` verde | [ ] confirmar |

---

## E. Se algo falhar

| Sintoma | Onde olhar |
|---------|------------|
| Upload 403/RLS | Storage INSERT + RLS `propostas` INSERT |
| Download admin 404 | Path no banco vs Storage; `candidatosPathProposta` |
| Órfãos persistentes | CSV + SQL de correção; reupload |
