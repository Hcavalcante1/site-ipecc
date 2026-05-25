# Checklist visual — go-live (sem deploy)

**Última validação:** 2026-05-25 · ambiente `http://localhost:3000` · BATCH 13

Conferir em staging/local antes de autorizar produção. Não substitui `PROD-PREP-CHECKLIST.md`.

---

## Resumo executivo

| Status geral | Detalhe |
|--------------|---------|
| **Go-live visual (código/layout)** | **Aprovado com ressalvas** |
| **Conteúdo CMS (staging)** | **Revisão humana obrigatória** |
| **Mobile ≤640px** | **Revisão humana recomendada** (CSS já aplicado nos batches 8–11) |

---

## Desktop (≥992px) — smoke 2026-05-25

| Página | HTTP | Layout / hero | Observação |
|--------|------|---------------|------------|
| `/` | 200 | OK | Hero, cards, destaques, notícias/eventos embutidos, números, impacto, CTA |
| `/propostas` | 200 | OK | Corrigido BATCH 13 (`head.tsx` → `layout.tsx` metadata) |
| `/editais` | 200 | OK | Listagem e documentação; **títulos de teste no CMS** |
| `/editais/[id]` | ver nota | OK (código) | Hero dinâmico; **se 500 no dev:** apagar `.next` e reiniciar `npm run dev` |
| `/projetos` | 200 | OK | Hero; eixos; **texto hero com vírgula dupla no CMS** (“unem , cultura”) |
| `/projetos/*` (4 filhas) | 200 | OK | `PublicProjectDetail`; link voltar |
| `/quem-somos` | 200 | Parcial | Hero + seções; **conferir MVV/CTA no browser** (client fetch) |
| `/transparencia` | 200 | OK | Seções e links; **dados de teste no CMS** (TESTE, TEST1…) |
| `/noticias` | 200 | OK | Grid `public-card` |
| `/eventos` | 200 | OK | Grid + metadados |
| `/contato` | 200 | OK | Smoke BATCH 14 (`validar:smoke-publico`) |

- [x] Home: hero, cards, destaques, números, depoimentos, CTA
- [x] `/projetos` + 4 páginas filhas (`/projetos/*`)
- [x] `/editais` + detalhe `/editais/[id]` (UUID staging)
- [x] `/transparencia` (tabelas e links)
- [x] `/propostas` (etapas do formulário)
- [x] `/noticias`, `/eventos`
- [x] `/contato` — smoke HTTP BATCH 14 (`validar:smoke-publico`)

---

## Mobile (≤640px)

Validação automatizada limitada; CSS defensivo já em `globals.css` (batches 8–11).

- [ ] Menu hambúrguer e topbar sem overflow horizontal — **revisão humana**
- [ ] Heroes legíveis (título + texto) — **revisão humana**
- [ ] Grids `.public-card-grid` em 1 coluna — **revisão humana**
- [ ] Formulário propostas utilizável — **revisão humana**
- [ ] Tabelas transparência com scroll horizontal — **revisão humana**

---

## Problemas encontrados

| Severidade | Item | Ação |
|------------|------|------|
| **Crítico (corrigido)** | `/propostas` retornava **404** com `app/propostas/head.tsx` legado | **Fix:** `layout.tsx` + remoção `head.tsx` (commit BATCH 13) |
| **Conteúdo** | Editais/transparência com registros de **teste** no Supabase staging | Limpar ou ocultar no admin antes de go-live |
| **Conteúdo** | Hero projetos: texto incompleto no CMS | Ajustar bloco `hero` em `/admin/paginas/projetos` |
| **Conteúdo** | Transparência cita “APECC” em parágrafo | Revisão institucional (IPECC vs APECC) |
| **Operacional** | `/editais/[uuid]` **500** intermitente (`MODULE_NOT_FOUND` em `.next`) | `rm -rf .next` + um único `npm run dev` |

---

## Itens aprovados (código / UX estrutural)

- Header/footer únicos via `app/layout.tsx`
- Heroes padronizados (`PublicHeroRolling`)
- Listagens notícias/eventos (`PublicPageContent` + cards)
- Formulário propostas multi-etapa renderiza
- Páginas filhas projetos públicas (não mais UI admin)

---

## Revisão humana / conteúdo (antes de produção)

- [ ] Revisar textos finais em `/projetos/*` (copy BATCH 11 é placeholder institucional)
- [ ] Limpar editais e transparência de dados de teste no staging
- [ ] Validar `/quem-somos` completo após hydrate (MVV, atuação, CTA)
- [ ] Rodada mobile no celular ou DevTools 375px
- [ ] Conferir `/contato` e envio de formulário

---

## Gates técnicos

```bash
npm run typecheck
npm run validar:publico
npm run validar:admin
npm run validar:enterprise
```

Runbook: `docs/runbook-staging-enterprise.md` · Pacote push: `docs/PUSH-PACKAGE-LOCAL.md`

## Observabilidade (opcional)

- `PUBLIC_FETCH_LOG=1` — leituras públicas
- `ADMIN_ACTION_LOG=1` — ações `logAction` no terminal
