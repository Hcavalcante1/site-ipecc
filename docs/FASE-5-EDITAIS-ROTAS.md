# Fase 5 — Editais: rotas admin (análise local)

**Escopo:** documentação apenas. Publicação e layout do sidebar **congelados** até autorização.

## Duas áreas distintas (não são duplicatas)

| Rota | Função | Exemplo |
|------|--------|---------|
| `/admin/editais` | Gestão de **editais** (documentos/registros, upload PDF, listagem) | Sidebar “Editais” |
| `/admin/paginas/editais` | CMS da **página pública** `/editais` (hero, mural, textos) | Menu “Páginas” → Editais |

Unificar arquivos em uma só árvore **não** é recomendado: domínios diferentes (conteúdo editorial vs. cadastro de edital).

## Melhoria local de baixo risco (quando autorizado)

1. **Cross-links** (sem mudar sidebar):
   - Em `/admin/editais`: link “Editar textos da página pública” → `/admin/paginas/editais`
   - Em `/admin/paginas/editais`: link “Gerenciar editais (PDFs)” → `/admin/editais`
2. **Tech debt:** `app/admin/editais/page.tsx` ainda usa `createBrowserClient` inline — migrar para `supabaseClient` (Fase 2.2 residual), sem alterar UI.

## O que não fazer sem autorização explícita

- Remover `/admin/paginas/editais` ou `/admin/editais`
- Alterar `app/admin/layout.tsx` (navegação)
- Redirects em massa que quebrem bookmarks de operadores

## Critério de pronto (Fase 5 mínima)

- [ ] Cross-links adicionados (opcional)
- [ ] `app/admin/editais/page.tsx` → `supabaseClient`
- [ ] Smoke: login → listar edital → abrir página pública `/editais`
