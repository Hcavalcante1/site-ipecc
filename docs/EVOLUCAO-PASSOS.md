# Evolução passo a passo — site IPECC

Roteiro operacional. Marque `[x]` conforme concluir.

## Fase 1 — Base pós-push (concluída 2026-05-26)

- [x] Landing `/` + editorial `/inicio` + redirects
- [x] SEO `www.ipecc.org.br`, footer, breadcrumbs, redes
- [x] Push `ipecc-whatsapp-leads` + espelho `site-ipecc`
- [x] Enterprise Guard local + agendamento 08:00
- [x] Docs ops atualizados (`ENTERPRISE-STATUS`, `PUSH-PACKAGE-LOCAL`)
- [x] Smoke HTTP com `/inicio` e redirects (18 rotas)
- [x] Chamada H1 da landing `/`: **Educação, esporte, cultura e cidadania** (menu continua **Portal**)

## Validações manuais (adiadas — fazer quando possível)

- [ ] **Etapa 8 Meta real:** `docs/WHATSAPP-META-SANDBOX.md` (ngrok + webhook + credenciais reais)
- [ ] **Etapa 9 Admin:** `docs/ETAPA-9-ADMIN-WHATSAPP.md` (`/admin/whatsapp` após handoff)
- [ ] **Fase 2 visual:** checklist abaixo + `docs/VISUAL-GO-LIVE-CHECKLIST.md`

Automação local já cobre: `npm run evolucao:segura` / `evolucao:segura:http` e DoD WhatsApp dry-run.

## Fase 2 — Homologação visual (equipe)

- [ ] Revisar `/` (Portal) desktop + mobile 375px
- [ ] Revisar `/inicio` (Início) desktop + mobile 375px
- [ ] Aceitar `docs/VISUAL-GO-LIVE-CHECKLIST.md`
- [ ] Revisão copy CMS (projetos, IPECC vs APECC)

## Fase 3 — Padronização páginas legadas

- [x] `quem-somos` → `PublicWhatsAppHelpLine` adicionada; layout `.sobre`/container mantido (grids complexos)
- [x] `transparencia` → hero + WhatsApp já padronizados; layout de seções mantido
- [x] `projetos` → reduzir uso de `.sobre` onde fizer sentido (eixos → `.projetos-eixos`; intro/metodologia mantêm `.sobre`)
- [x] `validar:public-pages-padrao` alinhado com o layout real (PublicPageContent apenas em `editais/[id]`)

## Fase 4 — WhatsApp Meta

- [ ] Sandbox Meta (`docs/WHATSAPP-META-SANDBOX.md`)
- [ ] Webhook em URL pública (preview Vercel ou túnel)
- [ ] Validar handoff no admin
- [x] Runbook operacional criado (`docs/FASE4-WHATSAPP-RUNBOOK.md`)

### DoD (Definition of Done) da Fase 4

- [x] `reports/whatsapp-meta.txt` com checks `OK:` esperados (in-process; UTF-8 via `coletar:reports-whatsapp-meta`)
- [x] `reports/whatsapp-webhook.txt` com fixture processada e idempotência (in-process)
- [x] `reports/whatsapp-webhook-http.txt` com GET `200` + POST `processed=1`
- [x] Evidência dedicada de handoff incluída (`reports/whatsapp-handoff-fase4.txt`) — coletada (in-process)
- [x] DoD valida recência dos reports (anti-evidência antiga)
- [x] Evidências coladas no `docs/ENTERPRISE-STATUS.md` (bloco automático + checklist via `sincronizar:checklist-fase4-status`)
- [x] Item "WhatsApp Fases 1–3" evoluído para "Meta sandbox validado" (local dry-run)
- [x] Nenhum report com `FALHA`/`ERROR`/`SKIP` sem justificativa registrada
- [x] `npm run validar:dod-whatsapp-meta:parcial` retornando sucesso
- [x] `npm run validar:dod-whatsapp-meta` retornando sucesso (completo, com HTTP E2E)
- [x] `npm run validar:env-whatsapp-meta` integrado antes da coleta
- [x] Comando único disponível: `npm run fase4:whatsapp-meta`
- [x] Comando único com atualização de status: `npm run fase4:whatsapp-meta:status`

### Fase 4.1 — Ordem de execução sugerida

- [x] Preencher `.env.local` com variáveis do sandbox (`WHATSAPP_*`) — template local via `preparar:env-whatsapp-meta -- --aplicar`
- [x] Rodar `npm run validar:whatsapp-meta`
- [x] Rodar `npm run validar:whatsapp-webhook`
- [ ] Subir túnel e validar `GET /api/whatsapp/webhook` (verify token) — Meta real (ngrok); preflight: `npm run validar:whatsapp-meta-real-preflight`
- [ ] Validar handoff visível em `/admin/whatsapp` (UI) — checklist: `docs/ETAPA-9-ADMIN-WHATSAPP.md`
- [x] Registrar evidências (saídas `OK:`) no `ENTERPRISE-STATUS.md`
- [x] Gerar artefatos com `scripts/coletar-evidencias-whatsapp-meta.ps1`
- [x] Automação de consolidação criada (`npm run resumo:whatsapp-meta-evidencias`)

## Fase 4.5 — Operação Enterprise (automação local)

- [x] Gate enterprise integrado com check estrutural da Fase 4 (`validar:status-fase4-whatsapp`)
- [x] Modo estendido do gate com execução Fase 4 (`validar:enterprise:fase4`, `guard:enterprise -- --include-fase4`)
- [x] Agendamento Windows com variante Fase 4 (`agendar-enterprise-guard.ps1 -IncludeFase4`)
- [x] Remoção segura das tarefas (padrão/Fase 4/ambas) no agendador
- [x] Verificação de tarefas agendadas (`verificar:agendamento-enterprise-guard`)
- [x] Diagnóstico operacional consolidado (`diagnostico:enterprise-operacao`)
- [x] Validador estrutural de ops (`validar:enterprise-ops`)
- [x] Push prep integrado com validação de ops (`validar:push-prep`)
- [x] Check diário unificado de operação (`check:enterprise-operacao`)
- [x] DoD parcial da Fase 4 (`validar:dod-whatsapp-meta:parcial`, `fase4:whatsapp-meta:parcial`)
- [x] Prontidão enterprise consolidada (`validar:enterprise-readiness`)
- [x] Sincronização de checklist manual no status (`sincronizar:checklist-fase4-status`)
- [x] Executar `npm run fase4:whatsapp-meta:full` e fechar DoD **completo** da Fase 4 (local dry-run)

## Fase 5 — Produção (congelado até autorização)

- [ ] `docs/PROD-PREP-CHECKLIST.md` completo
- [ ] Supabase produção: RLS, bucket, `proposta_anexos`
- [ ] Deploy host + secrets
- [ ] Smoke em URL de produção

## Comandos por fase

Guia rápido: `docs/ENTERPRISE-OPERACAO-QUICKSTART.md`

```bash
# Evolução segura (etapa a etapa, com npm run dev para variante :http)
npm run evolucao:segura
npm run evolucao:segura:http

# Diário / antes de push
npm run validar:enterprise-readiness
npm run check:enterprise-operacao
npm run guard:enterprise -- --no-build
npm run validar:public-pages-padrao
npm run auditar:cms-staging

# Fase 4 WhatsApp (com npm run dev ativo)
npm run fase4:whatsapp-meta:full

# Com npm run dev
npm run validar:smoke-publico

# Commit (sem .env.local)
# Ver docs/COMMIT-PACOTE-ENTERPRISE.md
```
