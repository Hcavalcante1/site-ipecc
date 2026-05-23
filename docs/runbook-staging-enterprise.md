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
4. [x] Órfãos: staging local **0** — `docs/operacional-correcao-orfaos.md`

---

## B. Comandos locais

**Dev estável:** use **um único** `npm run dev`. Pare o dev antes de `npm run build` (evita cache `.next` corrompido e erro `Cannot find module './XXXX.js'` em rotas como `/quem-somos`).

**Página em branco no admin (ex.: `/admin/propostas`):**

1. Confirme a URL na saída do terminal (`http://localhost:3000` ou `3001` — não use porta antiga morta).
2. Feche outros `npm run dev`; apague `.next`; suba de novo um único dev.
3. Aguarde `Compiled /admin/propostas` (primeira carga pode levar ~15–20s).
4. Sem login → redirect `/login` (307). Com sessão admin → listagem com cards escuros.
5. Se persistir: `npx tsc --noEmit` e abra o console do navegador (F12).

```bash
npx tsc --noEmit
npm run validar:release-prep
npm run validar:seguranca
npm run validar:staging
npm run correlacionar:orfaos-logs   # se audit:anexos > 0 órfãos
curl -s http://localhost:3002/api/health
```

Scripts operacionais usam `scripts/lib/loadEnvLocal.ts` (env unificado).

- [x] `tsc` sem erros (2026-05-22)
- [x] `audit:anexos` → **0 órfãos** (staging local 2026-05-22)
- [x] `npm run build` — sucesso (91 rotas)

---

## C. Smoke no navegador

| # | Teste | Esperado |
|---|--------|----------|
| 1 | `/propostas` — envio com PDF teste | [x] script 2026-05-23 (`validate:upload-proposta`); browser: etapas + campos OK, PDF manual no input |
| 2 | `/admin/propostas` — nova proposta na lista | [x] proposta staging visível |
| 3 | Detalhe admin — download anexo | [x] link download no detalhe |
| 4 | Download sem login (URL API propostas) | [x] **401** |
| 5 | `/admin/propostas/auditoria` | [x] **Órfãos: 0** |
| 6 | `/editais`, `/projetos`, `/quem-somos` | [x] OK em `http://localhost:3002` (200, conteúdo Supabase) |

Detalhe upload: `docs/fase3-validacao-upload-propostas.md`

---

## D. Critério “MVP enterprise” no código

| Critério | Status após runbook |
|----------|---------------------|
| Fase 1 staging validada | [ ] produção (local: download 401 OK) |
| Órfãos zerados ou exceção documentada | [x] staging local |
| Clients canônicos (sem inline em páginas) | [x] código |
| `audit:anexos` no processo | [x] |
| `tsc` + `build` verdes | [x] local; CI em `.github/workflows/ci.yml` |

---

## E. Se algo falhar

| Sintoma | Onde olhar |
|---------|------------|
| Upload 403/RLS | Storage INSERT + RLS `propostas` INSERT |
| Download admin 404 | Path no banco vs Storage; `candidatosPathProposta` |
| Órfãos persistentes | CSV + SQL de correção; reupload |

---

## Resumo consolidado

Ver `docs/STAGING-VALIDACAO-RESUMO.md` (validação local 2026-05-23).
