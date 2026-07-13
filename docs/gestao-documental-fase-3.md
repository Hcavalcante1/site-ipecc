# Gestão Documental — Fase 3

## Entregue

- CRUD de **fluxos** (`gd_document_workflows`) com seed de passos padrão
- CRUD de **passos** (`gd_workflow_steps`)
- **Transição** de status no documento via passo (`POST .../transicao`)
- **Histórico** de workflow (`gd_workflow_history`)
- **Permissões** por documento: usuário / grupo / cargo (`gd_document_permissions`)
- Auditoria com **IP** e **User-Agent** nas ações de fluxo/permissão/update/delete
- Coluna `gd_documents.workflow_id` (SQL Fase 3)

## SQL

Aplicar após a Fase 1:

`docs/sql/gestao-documental-fase-3.sql`

## Papéis (permission)

- admin, gestor, revisor, aprovador, signatario, consulta

Sem ACL no documento: quem tem o módulo pode transicionar (compatível com Fases 1–2).  
Com ACL de usuários: exige grant compatível com `role_required` do passo.

## APIs

- `GET/POST/PATCH/DELETE /api/admin/documentos/fluxos`
- `POST/DELETE /api/admin/documentos/fluxos/passos`
- `POST /api/admin/documentos/[id]/transicao`
- `GET/POST/DELETE /api/admin/documentos/[id]/permissoes`

## UI

- `/admin/documentos/fluxos` — gestão de fluxos e passos
- Detalhe do documento — transições, vínculo de fluxo, permissões

## Próxima fase

Fase 4 — integração real Assinatura Avançada gov.br (OAuth2 no backend).
