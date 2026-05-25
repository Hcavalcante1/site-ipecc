# BATCH 13 — Validação visual + pacote push local

## Escopo

- Smoke browser em rotas públicas principais (`localhost:3000`).
- Atualização `docs/VISUAL-GO-LIVE-CHECKLIST.md` com status e ressalvas.
- Fix crítico: `/propostas` 404 → `app/propostas/layout.tsx` + remoção `head.tsx`.
- `docs/PUSH-PACKAGE-LOCAL.md` + revisão `GITHUB-PUSH.md` / `README.md`.

## Validação

```bash
npx tsc --noEmit
npm run validar:publico
```

## Próximo

- Rodada mobile humana.
- Limpeza CMS staging (editais/transparência).
- Push quando autorizar (`PUSH-PACKAGE-LOCAL.md`).
