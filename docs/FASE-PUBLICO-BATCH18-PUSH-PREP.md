# BATCH 18 — Push prep (pacote GitHub)

## Escopo

- Atualizar `docs/PUSH-PACKAGE-LOCAL.md` (commits 8–17 + WhatsApp).
- `npm run validar:push-prep` — gate rápido de código.
- Checklist alinhado a `docs/GITHUB-PUSH.md`.

## Validação

```bash
npm run validar:push-prep
npm run validar:enterprise    # opcional, mais lento (build)
npm run auditar:cms-staging   # conteúdo — após limpeza manual
```

## Bloqueadores conhecidos (conteúdo, não código)

- 2 convênios `TESTE` / `\SBS\N` publicados — `docs/CMS-LIMPEZA-STAGING.md`
- Copy hero transparência (APECC) e projetos (vírgula dupla)

## Próximo

Push autorizado → `docs/GITHUB-PUSH.md`. Meta sandbox em paralelo.
