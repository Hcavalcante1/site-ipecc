# Roadmap Enterprise — IPECC Public Site

Documento vivo de planejamento. Atualizado após Fase 2.1 (propostas), auditoria de anexos e matriz Fase 2.2.

## Visão

Evoluir o CMS institucional para uma plataforma **segura, auditável e modular**, com domínio documental explícito, admin protegido e preparação para `proposta_anexos` / workflow futuro — **sem reescritas destrutivas**.

## Estado atual (concluído no código)

| Trilha | Status | Commits de referência |
|--------|--------|---------------------|
| Domínio documental (`lib/documental/`) | Concluída | `aff646b` … `8174993` |
| UI admin documental (`components/admin/propostas/detail/`) | Concluída | `db9f28e` |
| Hook `usePropostaDocumental` | Concluído | `b0f4663` |
| Fase 1 Segurança (download, middleware, email, gitignore) | Concluída | `ba17827`, `117ff95` |
| Verificação anexos (detalhe + listagem) | Concluída | `6ea77ca`, `9a50515` |
| Fonte única paths (`propostaPaths`) + auditoria CSV | Concluída | `56d2ada` |
| Fase 2.1 propostas → `supabaseClient` | Concluída | ver commits deste ciclo |
| Página `/admin/propostas/auditoria` read-only | Concluída | ver commits deste ciclo |
| Matriz Fase 2.2 + guia clients | Documentada | `docs/FASE-2-2-MIGRACAO-SUPABASE.md`, `docs/SUPABASE-CLIENTS.md` |
| Fase 2.3 público → `supabasePublic` | Concluída (código) | inclui `app/propostas/page.tsx` |
| Checklist upload Fase 3 | Documentado | `docs/fase3-validacao-upload-propostas.md` |

### Ferramentas operacionais

```bash
npm run audit:anexos   # CSV em reports/auditoria-anexos-YYYY-MM-DD.csv (read-only)
```

### Pendências no Supabase Dashboard (manual)

- Revisar políticas RLS/storage após bucket `propostas` privado
- Corrigir dados órfãos identificados no CSV (reupload ou limpar `*_url` no banco)
- Rotação de chaves se `.env` já vazou

---

## Macrocamadas alvo

```text
lib/documental/     → regras e parser (sem UI)
lib/storage/        → storage propostas (service role)
lib/auth/           → sessão admin (verifyAdminSession)
components/admin/   → UI admin modular
app/api/            → download, email, admin batch
scripts/            → auditoria e automação read-only
```

---

## Fases do Plano Mestre (prioridade de execução)

### Fase 1 — Segurança crítica ✅ (código)

- [x] Download `propostas` admin-only via `/api/download`
- [x] Middleware `getUser` em `/admin`
- [x] API email endurecida (`tipo: admin` exige sessão)
- [x] `.gitignore` env + tsbuildinfo
- [ ] Checklist Dashboard 100% validado em produção

### Fase 2 — Supabase / Auth ✅ (código — falta smoke upload Fase 3)

**Objetivo:** um client browser, um server, um admin; eliminar `createClient` solto em páginas.

| Cliente hoje | Uso | Ação recomendada |
|--------------|-----|------------------|
| `lib/supabaseClient.ts` | Login, admin layout, propostas, ~24 páginas admin | **Canônico browser** |
| ~~`lib/supabase-browser.ts`~~ | Removido | — |
| `lib/supabaseServer.ts` | Server Components | **Canônico server** |
| `lib/supabaseAdmin.ts` | API download, storage, auditoria | **Canônico service role** |
| `lib/getSupabase.ts` | `lib/homeData.ts` | Deprecar / migrar |
| `lib/supabasePublic.ts` | Público sem sessão | Manter se necessário |
| `createClient` inline no admin | — | ✅ Fase 2.2 concluída |

**Microetapas (baixo risco, uma PR cada):**

1. [x] Migrar módulo `app/admin/propostas` para `supabaseClient`
2. [x] Fase 2.2 — admin browser migrado (PR1–6)
3. [x] Migrar `app/propostas/page.tsx` → `supabasePublic` (validar upload: `docs/fase3-validacao-upload-propostas.md`)
3b. [x] Migrar editais, projetos, quem-somos públicos → `supabasePublic`
4. [x] Documentar clients: `docs/SUPABASE-CLIENTS.md` + `docs/FASE-2-2-MIGRACAO-SUPABASE.md`
5. [x] Remover `getSupabase.ts` (sem referências)

**Não fazer ainda:** trocar auth helpers package, RLS em massa, service role no browser.

### Fase 3 — Storage / Uploads / Downloads

- [x] Download propostas via proxy + bucket privado
- [ ] Upload público: validar política INSERT após bucket privado (`docs/fase3-validacao-upload-propostas.md`)
- [x] Paths novos sem `public/` legado (já no `uploadArquivo` de `/propostas`)
- [ ] Signed URLs com TTL (opcional, reduz service role no download)
- [ ] Padronizar paths (sem pasta `public/` legada em novos uploads)

### Fase 4 — Integridade documental ✅ + evolução

- [x] Detalhe: ocultar links órfãos + aviso
- [x] Listagem: resumo anexos por card
- [x] Script CSV global
- [x] Página admin read-only `/admin/propostas/auditoria` + API `auditoria-anexos`
- [ ] Modelo `proposta_anexos` (SQL + leitura paralela) — **decisão de produto**

### Fase 5 — Consolidação admin

- Unificar `/admin/editais` vs `/admin/paginas/editais`
- Reduzir `any` em formulários críticos
- Design system admin (`adminTokens`) só onde já padronizado

### Fase 6 — UI System público

- Fora do escopo imediato; não misturar com documental.

### Fase 7 — Performance

- Cache/revalidate em páginas públicas Supabase
- Batch APIs admin já iniciado (`resumo-anexos`)

### Fase 8 — Observabilidade

- [x] `logs_download`, script CSV
- [ ] Correlacionar órfãos com `admin_logs`
- [ ] Health check `/api/health` (opcional)

### Fase 9 — Escalabilidade / SaaS

- Multi-tenant, orgs — **não iniciar** sem requisito de negócio.

### Fase 10 — Hardening final

- Revisão RLS completa, pentest, backup, DR.

---

## Próximas 3 microetapas recomendadas (ordem)

| # | Etapa | Prioridade | Risco | Autorização |
|---|--------|------------|-------|-------------|
| 1 | ~~**Fase 2.1** — `app/admin/propostas` usa `supabaseClient`~~ | ✅ Feito | — |
| 2 | ~~**Página auditoria** `/admin/propostas/auditoria`~~ | ✅ Feito | — |
| 3 | **Operacional** — corrigir órfãos (4 hoje; plano em `docs/operacional-correcao-orfaos.md`) | Integridade | Baixo | Não (dados) |
| 4 | ~~**Fase 2.2** — admin browser → `supabaseClient` (PR1–6)~~ | ✅ Feito | — |
| 5 | ~~**Fase 2.3** — páginas públicas → `supabasePublic`~~ | ✅ Código | — |
| 6 | **Fase 3** — smoke test upload + checklist Dashboard | Operação | Médio | Não |
| 7 | **Operacional** — 1 órfão restante (teste; SQL em `docs/sql/`) | Dados | Baixo | Não |
| 8 | **Runbook staging** — `docs/runbook-staging-enterprise.md` | Operação | Baixo | Não |

**Parar e pedir autorização antes de:**

- Alterar `app/propostas/page.tsx` (fluxo público)
- Mudar RLS / middleware / auth global
- Tabela `proposta_anexos` + migração de dados
- Unificar dezenas de páginas admin de uma vez

---

## Preparação `proposta_anexos` (futuro)

Fonte já pronta em `lib/documental/propostaPaths.ts`:

- `ANEXOS_URL_PROPOSTA` — `{ key: coluna, label }` alinhado às colunas atuais
- Migração futura: 1 linha por anexo com `proposta_id`, `chave`, `storage_path`, `status`

Leitura híbrida sugerida: colunas legadas + tabela nova em paralelo (feature flag).

---

## Progresso resumido (plano mestre)

| Escopo | Concluído |
|--------|-----------|
| Núcleo fases 1–4 (código) | ~65% |
| Fase 2 admin browser | ~43% (26/60 arquivos) |
| MVP enterprise (5 critérios) | ~58% |

---

## Histórico de commits (trilha recente)

```
56d2ada chore(documental): auditoria CSV de anexos e DRY de paths no detalhe
9a50515 feat(admin): resumo de anexos órfãos na listagem de propostas
6ea77ca fix(documental): verificar anexos de proposta no admin e paths no storage
117ff95 fix(security): endurecer API de e-mail e centralizar sessão admin
ba17827 fix(security): fase 1 segurança crítica (higiene, download, middleware)
b0f4663 refactor(admin): extrair hook usePropostaDocumental do detalhe de proposta
```

---

## Critérios de “pronto” para release enterprise (MVP)

1. Fase 1 validada em staging com bucket privado e RLS revisada
2. Zero anexo órfão em propostas ativas OU aviso explícito no admin
3. Nenhum `createClient(anon)` novo fora dos clients canônicos
4. `npm run audit:anexos` documentado no runbook operacional
5. TypeScript e build CI verdes
