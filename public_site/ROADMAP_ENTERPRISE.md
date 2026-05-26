# Roadmap Enterprise Local/Staging

## Estado atual

- App Next.js em `public_site`, com rotas publicas institucionais e area admin.
- Validacao local padronizada por scripts npm (`typecheck`, `validar:enterprise`, `audit:anexos`, `verify:proposta-anexos`).
- Execucao limitada a local/staging: sem deploy, sem push, sem producao e sem SQL destrutivo.

## Prioridades operacionais

1. Seguranca: remover envs reais do Git, manter dependencias auditadas e evitar exposicao de service role.
2. Estabilidade: typecheck, build e smoke local antes de preparar release.
3. Integridade documental: garantir que `/docs/*` e `/media/*` referenciados existam.
4. Visual publico premium e responsividade mobile.
5. Admin/CMS local, observabilidade, performance e preparacao de release sem publicacao.

## Batches seguros pendentes

- Consolidar placeholders documentais e midias publicas faltantes apontadas por `npm run audit:anexos`.
- Executar `npm run build` apos typecheck e audit enterprise ficarem verdes.
- Rodar smoke local com `npm run dev` + `npm run smoke:site`.
- Revisar rotas admin sem pagina implementada no menu lateral e alinhar fallback/links.
- Melhorar cabecalho mobile publico com menu mais compacto.

## Bloqueios de producao

- Nao executar deploy, push, alteracoes de Supabase producao, DROP, limpeza de dados ou mudancas criticas de RLS sem revisao SQL explicita.
