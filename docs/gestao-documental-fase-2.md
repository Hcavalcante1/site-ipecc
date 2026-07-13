# Gestão Documental — Fase 2

## Entregue

- Filtros na listagem: status, pasta, categoria, favoritos, busca (título/número/descrição)
- Favoritar / arquivar / duplicar / lixeira + restaurar
- Tags por documento
- Preview interno: PDF (iframe), imagem, TXT
- Histórico de ações no detalhe
- CRUD de modelos (`gd_document_templates`)
- Página `/admin/documentos/lixeira`

## APIs novas / estendidas

- `GET /api/admin/documentos?favorite=1&deleted=1&folder_id=&category_id=&status=&q=`
- `POST /api/admin/documentos/[id]/duplicar`
- `POST /api/admin/documentos/[id]/restaurar`
- `GET/POST/DELETE /api/admin/documentos/[id]/tags`
- `GET/POST/PATCH/DELETE /api/admin/documentos/modelos`
- `GET /api/admin/documentos/[id]` retorna `tags`, `logs`, `previewKind`, `previewText`

## Fora desta fase

- Preview DOCX
- Workflows configuráveis (Fase 3)
- Assinatura gov.br (Fase 4)

## Validação

```bash
npm run validar:documentos
npm run typecheck
npm run build
```
