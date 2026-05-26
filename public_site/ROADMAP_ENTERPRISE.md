# Roadmap Enterprise Local/Staging

## Estado atual

- App Next.js em `public_site`, com rotas publicas institucionais e area admin.
- Validacao local padronizada por scripts npm (`typecheck`, `validar:enterprise`, `audit:anexos`, `verify:proposta-anexos`).
- Baseline local verde: `npx tsc --noEmit`, `npm run validar:enterprise`, `npm run build` e `npm run smoke:site`.
- Next/React e dependencias principais atualizadas; `npm audit --omit=dev` sem vulnerabilidades.
- Guard admin migrado de `middleware.ts` para `proxy.ts` no padrao do Next atual.
- Cabecalho publico mobile ajustado para menu compacto com rolagem horizontal segura.
- Execucao limitada a local/staging: sem deploy, sem push, sem producao e sem SQL destrutivo.

## Prioridades operacionais

1. Seguranca: remover envs reais do Git, manter dependencias auditadas e evitar exposicao de service role.
2. Estabilidade: typecheck, build e smoke local antes de preparar release.
3. Integridade documental: garantir que `/docs/*` e `/media/*` referenciados existam.
4. Visual publico premium e responsividade mobile.
5. Admin/CMS local, observabilidade, performance e preparacao de release sem publicacao.

## Batches seguros pendentes

- Revisar rotas admin sem pagina implementada no menu lateral e alinhar fallback/links.
- Revisar consistencia visual das paginas publicas internas apos o cabecalho mobile.
- Adicionar observabilidade local leve para rotas admin/API sem servicos externos.
- Preparar checklist de release staging sem executar push/deploy.

## Bloqueios de producao

- Nao executar deploy, push, alteracoes de Supabase producao, DROP, limpeza de dados ou mudancas criticas de RLS sem revisao SQL explicita.
