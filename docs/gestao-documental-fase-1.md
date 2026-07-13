# Gestão Documental — Fase 1

## Objetivo

Fundação do módulo corporativo de Gestão Documental no Admin IPECC: schema, menu, escopo, CRUD mínimo e provider de assinatura em stub.

## Decisões

| Tema | Decisão |
|------|----------|
| Tenant | `processo_id` (multi-admin existente), não `organization_id` |
| Prefixo tabelas | `gd_` |
| Módulo de escopo | `documentos` + coluna `admin_escopos.mod_documentos` |
| Validação UI | Formulários controlados (padrão do projeto) |
| Validação API | Funções em `lib/documentos/validators.ts` (Zod fica para fase futura se necessário) |
| Assinatura | Interface `SignatureProvider` + `GovBrProvider` stub |
| Testes | `npm run validar:documentos` (script, sem Jest) |
| Lint | Projeto não tem `npm run lint`; gate = typecheck + build + validar |

## SQL a aplicar no Supabase (ordem)

1. `docs/sql/admin-escopos-mod-documentos.sql`
2. `docs/sql/gestao-documental-fase-1.sql`
3. `docs/sql/gestao-documental-storage-bucket.sql`

## Rotas Admin

- `/admin/documentos/dashboard`
- `/admin/documentos/documentos` (+ `/novo`, `/[id]`)
- `/admin/documentos/pastas`
- `/admin/documentos/categorias`
- Shells: modelos, fluxos, assinaturas, lotes, signatarios, auditoria, configuracoes

## APIs

- `GET/POST /api/admin/documentos`
- `GET/PATCH/DELETE /api/admin/documentos/[id]`
- `POST /api/admin/documentos/[id]/upload`
- `GET/POST/DELETE /api/admin/documentos/pastas`
- `GET/POST/DELETE /api/admin/documentos/categorias`
- `GET /api/admin/documentos/dashboard`
- `GET /api/admin/documentos/auditoria`

## Env (Fase 4 — não usar no frontend)

```
GOVBR_SIGNATURE_CLIENT_ID=
GOVBR_SIGNATURE_CLIENT_SECRET=
GOVBR_SIGNATURE_REDIRECT_URI=
```

## Próximas fases

Concluídas nas entregas seguintes. Ver **fechamento**: `docs/gestao-documental-fechamento.md`.

~~2. Gestão completa (tags, favoritos, preview, modelos)~~  
~~3. Workflows e permissões internas~~  
~~4. Integração gov.br real~~  
~~5. Lotes e multi-signatários~~  
~~6. Notificações e integrações entre módulos~~
