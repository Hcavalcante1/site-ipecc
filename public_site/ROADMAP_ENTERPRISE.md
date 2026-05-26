# Roadmap enterprise local/staging

## Baseline concluido neste ciclo

- Dependencias atualizadas para reduzir superficie de vulnerabilidades locais.
- Scripts enterprise adicionados para typecheck, auditoria de anexos, verificacao de propostas e smokes HTTP locais.
- Arquivos `.env.local` reais removidos do rastreamento Git e exemplos Supabase padronizados.
- Correcoes TypeScript aplicadas em login e admin de documentos.
- Login/logout admin alinhados ao proxy por cookies HTTP-only em `/api/admin/login` e `/api/admin/logout`.
- Endpoint `/api/health` criado para observabilidade local/staging sem expor segredos.

## Proximos batches seguros

1. Revisar responsividade do menu publico em telas pequenas.
2. Mapear pendencias de anexos documentais reais em `public/docs` ou storage Supabase staging.
3. Revisar o subprojeto legado `app/admin` antes de qualquer remocao ou merge estrutural.

## Bloqueios de producao

- Nao executar deploy, push, alteracoes Supabase Dashboard, SQL destrutivo ou mudancas criticas de RLS sem revisao especifica.
