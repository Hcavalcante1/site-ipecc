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

## Fase 2 — Homologação visual (equipe)

- [ ] Revisar `/` (Portal) desktop + mobile 375px
- [ ] Revisar `/inicio` (Início) desktop + mobile 375px
- [ ] Aceitar `docs/VISUAL-GO-LIVE-CHECKLIST.md`
- [ ] Revisão copy CMS (projetos, IPECC vs APECC)

## Fase 3 — Padronização páginas legadas

- [x] `quem-somos` → `PublicPageContent` + `PublicWhatsAppHelpLine` (hero já era `PublicHeroRolling`)
- [x] `transparencia` → `PublicPageContent` (hero + WhatsApp já padronizados)
- [ ] `projetos` → reduzir uso de `.sobre` onde fizer sentido
- [x] `validar:public-pages-padrao` exige `PublicPageContent` em quem-somos e transparência

## Fase 4 — WhatsApp Meta

- [ ] Sandbox Meta (`docs/WHATSAPP-META-SANDBOX.md`)
- [ ] Webhook em URL pública (preview Vercel ou túnel)
- [ ] Validar handoff no admin

## Fase 5 — Produção (congelado até autorização)

- [ ] `docs/PROD-PREP-CHECKLIST.md` completo
- [ ] Supabase produção: RLS, bucket, `proposta_anexos`
- [ ] Deploy host + secrets
- [ ] Smoke em URL de produção

## Comandos por fase

```bash
# Diário / antes de push
npm run guard:enterprise -- --no-build
npm run validar:public-pages-padrao
npm run auditar:cms-staging

# Com npm run dev
npm run validar:smoke-publico
```
