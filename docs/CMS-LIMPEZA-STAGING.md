# Limpeza CMS — staging (manual)

**Não executar em produção** sem autorização explícita. Este roteiro é para o projeto Supabase de **staging/local** apontado por `.env.local`.

## Objetivo

Remover ou ocultar conteúdo de **teste** que aparece no site público (`/editais`, `/transparencia`), sem alterar código nem fazer deploy.

## 1. Auditoria automática (read-only)

```bash
npm run auditar:cms-staging
```

Lista registros **publicados** com títulos suspeitos (`TEST`, `TESTE`, `TEST1`, etc.) e blocos de copy a revisar (vírgula dupla, APECC).

Exit code **1** = ainda há itens a tratar.

## 2. Caminhos no admin (preferido)

| Conteúdo | Admin |
|----------|--------|
| Editais | `/admin/editais` → excluir ou corrigir |
| Convênios transparência | `/admin/paginas/transparencia/convenios` |
| Editais transparência | `/admin/paginas/transparencia/editais` |
| Prestação de contas | `/admin/paginas/transparencia/prestacao` |
| Hero / textos projetos | `/admin/paginas/projetos` |
| Copy transparência (APECC) | `/admin/paginas/transparencia` |

**Alternativa rápida (sem apagar):** desmarcar **Publicado** nos registros de teste.

## 3. SQL no Dashboard (somente staging)

1. Rodar **SELECT** em `docs/sql/cms-limpeza-staging-AUDIT.sql`
2. Conferir IDs manualmente
3. Se autorizado: `docs/sql/cms-limpeza-staging-OCULTAR-OPCIONAL.sql` (`publicado = false`)

Nunca rodar DELETE em massa sem backup.

## 4. Validação pós-limpeza

```bash
npm run auditar:cms-staging    # deve exit 0
npm run validar:smoke-publico
```

Conferir no browser: `/editais`, `/transparencia`.

## 5. Checklist

- [ ] `auditar:cms-staging` → OK
- [ ] Nenhum `TEST*` visível em `/transparencia`
- [ ] Editais públicos são reais ou rascunho oculto
- [ ] Hero projetos sem vírgula dupla
- [ ] Texto transparência: IPECC (não APECC) — revisão institucional

## Próximo

Push prep: `docs/PUSH-PACKAGE-LOCAL.md` (após limpeza aceita pela equipe).
