# Fase público — BATCH 11 (staging)

## Escopo

- `editais/[id]`: hero `PublicHeroRolling`.
- Páginas `/projetos/*`: corrigidas (removido conteúdo admin incorreto nas rotas públicas).
- `PublicProjectDetail` para layout filho de projetos.
- Observabilidade admin leve: `logAdminAction` + `ADMIN_ACTION_LOG=1`.
- `docs/VISUAL-GO-LIVE-CHECKLIST.md`.

## Validação

```bash
npm run typecheck
npm run validar:publico
```

Smoke: `/projetos/valer-mais`, `/editais` (abrir um edital).

## Próximo (BATCH 12)

- `validar:enterprise` completo documentado no runbook.
- Dívida: `PublicLayout` vs `app/layout.tsx` (só doc, sem remover legado).
- Hardening: revisar páginas admin restantes com `supabaseClient` inline.
