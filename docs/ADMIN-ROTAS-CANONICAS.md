# Admin — rotas canônicas (CMS)

Mapa único em `lib/admin/canonicalAdminRoutes.ts`. Rotas legadas fazem `redirect()` para estas URLs.

## Páginas do site (`/admin/paginas`)

| Seção | Rota canônica |
|-------|----------------|
| Hub | `/admin/paginas` |
| Início (blocos) | `/admin/paginas/hero`, `cards`, `destaques`, … |
| Quem Somos — hub | `/admin/paginas/quem-somos` |
| Quem Somos — bloco principal | `/admin/paginas/quem-somos/bloco-principal` |
| Quem Somos — atuação | `/admin/paginas/quem-somos/atuacao` |
| Editais — CMS (página pública) | `/admin/paginas/editais` (+ hero, textos, documentos, mural, cta) |

## Cadastro de editais (tabela `editais`)

| Função | Rota |
|--------|------|
| Lista / upload PDF | `/admin/editais` |
| Editar um edital | `/admin/editais/[id]` |

Não confundir com **CMS da página** `/editais` (conteúdo em `paginas_conteudo`).

### Banco Supabase (editais)

- Tabela **`editais_secoes`**: não existe neste projeto (confirmado no SQL Editor). Código admin legado redireciona; API de mutação **não** lista mais essa tabela.
- Conteúdo público de hero / documentos / cta: tabela **`paginas_conteudo`** com `pagina_slug = 'editais'`.
- Diagnóstico: `docs/sql/diagnostico-editais-secoes-RAPIDO.sql`.

## Legadas (redirecionam automaticamente)

- `/admin/dashboard` → `/admin`
- `/admin/paginas/quem-somos/institucional` → `bloco-principal`
- `/admin/paginas/quem-somos/eixos` → `atuacao`
- `/admin/paginas/editais/[id]` → `/admin/editais/[id]`
- `/admin/editais/hero`, `textos`, `documentos`, `mural`, `textos/hero`, `textos/nova-secao` → rotas em `/admin/paginas/editais/…`
- `/admin/paginas/editais/textos/hero` e `nova-secao` → hero ou textos canônicos

## Regra para novas telas

Uma função = uma rota canônica. Se renomear ou mover, deixar `page.tsx` antigo só com `redirect()`.

Importar URLs de `lib/admin/canonicalAdminRoutes.ts` nos hubs (não hardcodar string).

## Validação CI/local

```bash
npm run validar:admin-rotas
```

Falha se alguém reintroduzir `href` para rotas legadas fora das páginas de redirect.
