# Pacote local — pós-push (homologação contínua)

**Atualizado:** 2026-05-26 · **Branch:** `main` · **HEAD:** `22f9978` · **Remote:** `origin` → `ipecc-whatsapp-leads` · espelho `site-ipecc`

## Estado do repositório

```text
Branch: main (sincronizada com origin e site-ipecc)
Working tree: limpa após push
Pendente local (nunca commitar): .env.local, .cursor/, reports/, .next/
```

## Rotas públicas (arquitetura atual)

| URL | Função |
|-----|--------|
| `/` | Landing (`ApresentacaoLanding`) — menu **Portal**; H1: *Educação, esporte, cultura e cidadania* |
| `/inicio` | Home editorial (CMS) — menu **Início** |
| `/apresentacao` | 308 → `/` |
| `/portal` | 308 → `/inicio` |

SEO canônico: `https://www.ipecc.org.br`

## Commits recentes (trilha ativa)

| Hash | Mensagem |
|------|----------|
| `22f9978` | docs(ops): ENTERPRISE-STATUS pós-push |
| `7899f94` | chore(guard): Enterprise Guard local |
| `2a94f6d` | feat(public): landing `/`, `/inicio`, SEO |
| `cfd0f19` | chore(cursor): `.cursorignore` |

## Gates (rodar antes de cada push)

```bash
npm run validar:push-prep
npm run validar:public-pages-padrao
npm run auditar:cms-staging          # conteúdo Supabase staging
npm run guard:enterprise             # completo (ou -- --no-build)
```

Com `npm run dev` em `http://localhost:3000`:

```bash
npm run validar:smoke-publico        # inclui /, /inicio e redirects
npm run validar:whatsapp-public-pages
```

## Checklist operacional

1. [x] Push `origin` (`ipecc-whatsapp-leads`) — 2026-05-26
2. [x] Espelho `site-ipecc` alinhado
3. [x] `guard:enterprise` + agendamento Windows 08:00
4. [x] `auditar:cms-staging` → 0 suspeitos (2026-05-26)
5. [ ] `docs/VISUAL-GO-LIVE-CHECKLIST.md` — aceite equipe (revisar `/` e `/inicio`)
6. [ ] Go-live produção — `docs/PROD-PREP-CHECKLIST.md` (congelado)

## Push adicional

```powershell
.\scripts\push-prep.ps1 -RemoteUrl "https://github.com/Hcavalcante1/ipecc-whatsapp-leads.git" -Push -UseMain
git push site-ipecc main:main   # espelho automation
```

## Arquivos que NUNCA devem ir no stage

- `.env.local`
- `.cursor/`
- `reports/`
- `*.tsbuildinfo`
- `.next/`

## Referências

- Status: `docs/ENTERPRISE-STATUS.md`
- Push: `docs/GITHUB-PUSH.md`
- Guard local: `docs/ENTERPRISE-GUARD-LOCAL.md`
- Visual: `docs/VISUAL-GO-LIVE-CHECKLIST.md`
- CMS: `docs/CMS-LIMPEZA-STAGING.md`
- WhatsApp Meta: `docs/WHATSAPP-META-SANDBOX.md`
