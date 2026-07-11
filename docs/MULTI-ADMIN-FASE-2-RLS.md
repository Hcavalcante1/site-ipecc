# Multi-admin — Fase 2 RLS (escopo por processo)

**Quando aplicar:** depois de `docs/sql/multi-admin-processos-fase-1.sql` e do código local das fases 2–3 do admin.

**Deploy:** só quando o pacote final for liberado (não precisa ir ao ar agora).

## Arquivo

`docs/sql/multi-admin-processos-fase-2-rls.sql`

## O que faz

| Área | Público (anon) | Admin autenticado |
|------|----------------|-------------------|
| Editais | SELECT se **não** for `rascunho` | Mestre tudo; operador só `processo_id` do escopo + `mod_editais` |
| Notícias / Eventos | SELECT se `publicado` | Idem com `mod_noticias` / `mod_eventos` |
| Documentos públicos | SELECT se `publicado` | Via edital + `mod_editais` |
| Propostas | **INSERT** liberado (formulário) | SELECT/UPDATE/DELETE via edital + `mod_propostas` |

APIs com **service_role** (`/api/admin/mutate`, governança) **não** são afetadas pelo RLS.

## Como aplicar

1. Supabase Dashboard → **SQL** → New query  
2. Colar o conteúdo de `multi-admin-processos-fase-2-rls.sql`  
3. **Run**  
4. Se houver policies antigas com **outros nomes** na mesma tabela, abrir **Authentication → Policies** e remover duplicatas que conflitem

## Smoke checklist

1. Sem login: `/editais` lista só não-rascunho; `/propostas` ainda envia  
2. Login **mestre**: vê rascunhos e todos os processos  
3. Login **operador** com escopo num processo: vê só aquele processo; URL de outro edital/governança falha  
4. Operador **sem** `processo_id` no edital antigo: não aparece até o mestre vincular o processo na edição  

## Rollback rápido

No SQL Editor, para cada tabela afetada:

```sql
-- Exemplo (repita para noticias, eventos, documentos_publicos, propostas)
drop policy if exists "editais_select_publico" on public.editais;
drop policy if exists "editais_select_admin_escopo" on public.editais;
drop policy if exists "editais_write_admin_escopo" on public.editais;
-- ... demais policies do script
```

Ou desative RLS temporariamente só em emergência:

```sql
alter table public.editais disable row level security;
```
