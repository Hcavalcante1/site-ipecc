# Ciclo Transparencia — Modulo vendavel

## Decisao de produto

Transparencia e modulo de 1a classe no multi-login (`mod_transparencia`), junto com Editais e Propostas. Fecha o ciclo institucional:

`Edital → Propostas → Convenio (rascunho) → Prestacao (rascunho) → Publicacao humana em /transparencia`

## SQL obrigatorio

Aplicar no Supabase:

`docs/sql/transparencia-modulo-ciclo-fase-1.sql`

Sem esse SQL, a ponte retorna erro pedindo a aplicacao.

## Ponte automatica (nunca publica sozinha)

API: `POST /api/admin/transparencia/ponte`

| Acao | Quando |
|------|--------|
| `convenio_de_proposta` | Proposta marcada `aprovado` |
| `espelhar_documento` | Documento oficial publicado na governanca |
| `prestacoes_do_edital` | Fase `prestacao_contas` |
| `prestacao_de_convenio` | Convenio salvo com `publicado=true` |

Tudo cria/atualiza com `publicado=false`, exceto quando o humano ja publicou o convenio e so entao gera rascunho de prestacao.

## Admin

- Menu Operacao → **Transparencia** (se `pode("transparencia")`)
- Hub: `/admin/paginas/transparencia`
  - Processo: so ciclo (convenios / editais / prestacao)
  - Site (`paginas` / mestre): tambem hero, compromissos, docs, LGPD, CTA
- Convenios filtrados por `processo_id` do escopo
- Painel: KPI **Transparencia pendente**
- Ver tambem: `docs/ADMIN-SITE-VS-PROCESSO.md`

## Checklist manual

1. Aplicar SQL
2. Login mestre/operador com `mod_transparencia`
3. Aprovar proposta → toast de rascunho convenio
4. Abrir Convenios → revisar → publicar
5. Conferir `/transparencia`
6. Fase prestacao_contas ou publicacao do convenio → rascunho prestacao
