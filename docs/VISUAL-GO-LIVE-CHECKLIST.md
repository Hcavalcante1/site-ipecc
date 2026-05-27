# Checklist visual — go-live (sem deploy)

**Última validação:** 2026-05-26 · ambiente `http://localhost:3000` · split Portal (`/`) vs Início (`/inicio`)

Conferir em staging/local antes de autorizar produção. Não substitui `PROD-PREP-CHECKLIST.md`.

---

## Resumo executivo

| Status geral | Detalhe |
|--------------|---------|
| **Go-live visual (código/layout)** | **Aprovado com ressalvas** |
| **Conteúdo CMS (staging)** | **Revisão humana obrigatória** |
| **Mobile ≤640px** | **Ajustes BATCH 16** (375px validado no browser) | Revisão humana no celular físico recomendada |

---

## Arquitetura de rotas (desde 2026-05-26)

| URL | Menu | Conteúdo |
|-----|------|----------|
| `/` | Portal | Landing `ApresentacaoLanding` (captação, SEO, CTA) |
| `/inicio` | Início | Home editorial (hero CMS, cards, notícias, eventos) |
| `/portal` | — | 308 → `/inicio` |
| `/apresentacao` | — | 308 → `/` |

## Desktop (≥992px) — smoke 2026-05-26

| Página | HTTP | Layout / hero | Observação |
|--------|------|---------------|------------|
| `/` | 200 | Revisar | Landing nova — seções de captação, link para `/inicio` |
| `/inicio` | 200 | Revisar | Ex-home: hero, cards, destaques, notícias/eventos, números, impacto, CTA |
| `/portal` | 308 | OK | Redirect para `/inicio` |
| `/apresentacao` | 308 | OK | Redirect para `/` |
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

- [ ] **Portal `/`:** landing (CTAs, SEO, link único para `/inicio`)
- [ ] **Início `/inicio`:** hero, cards, destaques, números, depoimentos, CTA
- [x] `/projetos` + 4 páginas filhas (`/projetos/*`)
- [x] `/editais` + detalhe `/editais/[id]` (UUID staging)
- [x] `/transparencia` (tabelas e links)
- [x] `/propostas` (etapas do formulário)
- [x] `/noticias`, `/eventos`
- [x] `/contato` — smoke HTTP BATCH 14 (`validar:smoke-publico`)

---

## Mobile (≤640px)

Validação automatizada + browser **375px** (BATCH 16); CSS defensivo em `globals.css` (batches 8–11, 15–16).

- [x] Menu hambúrguer e topbar — **OK** (scroll horizontal na tarja social, intencional)
- [x] Heroes legíveis — **OK** após BATCH 16
- [x] Grids `.public-card-grid` em 1 coluna — **OK**
- [x] Formulário propostas utilizável — **OK** (grids 1 col + pills largura total)
- [x] Tabelas transparência com scroll horizontal — **OK** (`.public-content table`)

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
- [ ] Limpar editais e transparência de dados de teste no staging — roteiro `docs/CMS-LIMPEZA-STAGING.md` + `npm run auditar:cms-staging`
- [ ] Validar `/quem-somos` completo após hydrate (MVV, atuação, CTA)
- [ ] Rodada mobile no celular ou DevTools 375px
- [ ] Conferir `/contato` e envio de formulário

---

## Gates técnicos

```bash
npm run typecheck
npm run validar:public-pages-padrao
npm run validar:smoke-publico   # com npm run dev
npm run validar:publico
npm run validar:admin
npm run guard:enterprise
```

Runbook: `docs/runbook-staging-enterprise.md` · Pacote push: `docs/PUSH-PACKAGE-LOCAL.md`

## Observabilidade (opcional)

- `PUBLIC_FETCH_LOG=1` — leituras públicas
- `ADMIN_ACTION_LOG=1` — ações `logAction` no terminal
