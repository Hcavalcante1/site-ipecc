# Fase enterprise — BATCH 12 (staging)

## Escopo

- Documentação `PUBLIC-LAYOUT-LEGADO.md` (sem remover `PublicLayout` / `LayoutGate`).
- Runbook: gate `validar:enterprise` + checklist visual pré-go-live.
- Script `validar:admin` (clients admin canônicos).
- Comentários `@deprecated` em `LayoutGate`.

## Validação

```bash
npm run typecheck
npm run validar:publico
npm run validar:admin
npm run validar:enterprise
```

Checklist manual: `docs/VISUAL-GO-LIVE-CHECKLIST.md`

## Próximo (BATCH 13)

- Hardening operacional: correlacionar logs + smoke M4 se flags mudarem.
- Preparar branch/PR local (sem push até autorizar).
- Revisão conteúdo CMS das páginas filhas de projetos (textos finais com equipe).
