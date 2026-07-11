# Admin: site IPECC vs processo

## Regra

Login de processo (ex. ETEC) libera **somente** o que e daquele processo.
Nunca libera o que altera o **site institucional IPECC** (global).

## Pode liberar (processo)

| Modulo | O que cobre |
|--------|-------------|
| `editais` | Editais do processo |
| `propostas` | Propostas do processo |
| `transparencia` | Ciclo: convenios, espelho de editais/resultados, prestacao |
| `projetos` | Pagina/conteudo de projetos do processo |
| `noticias` / `eventos` | Conteudo amarrado ao escopo do processo |

Tudo amarrado a `processo_id` / escopo do login.

## Nunca liberar (site)

- Heroes, CTAs institucionais, compromissos
- LGPD / politica de privacidade da entidade
- CMS generico (home, quem somos, contato) — modulo `paginas`
- Documentos institucionais da entidade (estatuto, atas, CNDs globais)

Esses exigem **mestre** ou modulo **`paginas`**.

## Detalhe importante

- `mod_projetos` **nao** concede `paginas`.
- Menu **Projetos** usa `pode("projetos")` e aponta para `/admin/paginas/projetos`.
- Menu **Paginas** usa `pode("paginas")` (mestre).
- Hub `/admin/paginas/transparencia`:
  - so `transparencia` → Convenios + Editais/chamamentos + Prestacao
  - mestre / `paginas` → tambem hero, compromissos, docs institucionais, LGPD, CTA

## Guard

`app/admin/paginas/layout.tsx` + `RequireAdminModulo` redireciona para `/admin`
se o operador tentar CMS de site sem `paginas`.
