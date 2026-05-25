# Checklist visual — go-live (sem deploy)

Conferir em staging/local antes de autorizar produção. Não substitui `PROD-PREP-CHECKLIST.md`.

## Desktop (≥992px)

- [ ] Home: hero, cards, destaques, números, depoimentos, CTA
- [ ] `/projetos` + 4 páginas filhas (`/projetos/*`)
- [ ] `/editais` + detalhe `/editais/[id]`
- [ ] `/transparencia` (tabelas e links)
- [ ] `/propostas` (etapas do formulário)
- [ ] `/noticias`, `/eventos`, `/contato`, `/quem-somos`

## Mobile (≤640px)

- [ ] Menu hambúrguer e topbar sem overflow horizontal
- [ ] Heroes legíveis (título + texto)
- [ ] Grids `.public-card-grid` em 1 coluna
- [ ] Formulário propostas utilizável
- [ ] Tabelas transparência com scroll horizontal

## Gates técnicos

```bash
npm run typecheck
npm run validar:publico
npm run validar:admin
npm run validar:enterprise
```

Runbook completo: `docs/runbook-staging-enterprise.md`

## Observabilidade (opcional)

- `PUBLIC_FETCH_LOG=1` — leituras públicas
- `ADMIN_ACTION_LOG=1` — ações `logAction` no terminal
