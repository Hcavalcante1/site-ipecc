# Fase público — BATCH 10 (staging)

## Escopo

- Heroes padronizados: **home**, **transparência**, **propostas**.
- `PublicHeroRolling` aceita `children` (CTA da home).
- Formulário propostas: classes `.public-form-shell*` (mesmo visual, menos inline).
- Mobile home: botão hero + shell do formulário em ≤640px.
- `logPublicFetch` na home.

## Validação

```bash
npm run typecheck
npm run validar:publico
npm run validar:enterprise
```

Smoke: `/`, `/transparencia`, `/propostas` (fluxo visual; envio só se staging ativo).

## Próximo (BATCH 11)

- Dívida: `editais/[id]` hero; páginas projeto filhas.
- Observabilidade admin leve; `validar:enterprise` no CI local recorrente.
- Preparar checklist visual go-live (sem deploy).
