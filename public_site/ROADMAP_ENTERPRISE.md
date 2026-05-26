# Roadmap enterprise local/staging

## Baseline concluido neste ciclo

- Dependencias atualizadas para reduzir superficie de vulnerabilidades locais.
- Scripts enterprise adicionados para typecheck, auditoria de anexos, verificacao de propostas e smokes HTTP locais.
- Arquivos `.env.local` reais removidos do rastreamento Git e exemplos Supabase padronizados.
- Correcoes TypeScript aplicadas em login e admin de documentos.

## Proximos batches seguros

1. Consolidar autenticacao admin para cookies HTTP-only em todo o fluxo `/login` e `/admin`.
2. Revisar responsividade do menu publico em telas pequenas.
3. Criar endpoint `/api/health` local sem expor segredos.
4. Mapear pendencias de anexos documentais reais em `public/docs` ou storage Supabase staging.
5. Revisar o subprojeto legado `app/admin` antes de qualquer remocao ou merge estrutural.

## Bloqueios de producao

- Nao executar deploy, push, alteracoes Supabase Dashboard, SQL destrutivo ou mudancas criticas de RLS sem revisao especifica.
