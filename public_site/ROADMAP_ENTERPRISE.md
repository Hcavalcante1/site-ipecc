# Roadmap enterprise local/staging

## Baseline concluido neste ciclo

- Dependencias atualizadas para reduzir superficie de vulnerabilidades locais.
- Scripts enterprise adicionados para typecheck, auditoria de anexos, verificacao de propostas e smokes HTTP locais.
- Arquivos `.env.local` reais removidos do rastreamento Git e exemplos Supabase padronizados.
- Correcoes TypeScript aplicadas em login e admin de documentos.
- Login/logout admin alinhados ao proxy por cookies HTTP-only em `/api/admin/login` e `/api/admin/logout`.
- Endpoint `/api/health` criado para observabilidade local/staging sem expor segredos.
- Cabecalho/menu publico recebeu ajustes responsivos para navegacao mobile horizontal e alvos de toque maiores.
- Transparencia publica passou a marcar placeholders documentais vazios como "em atualização" em vez de oferecer downloads vazios.

## Proximos batches seguros

1. Substituir placeholders vazios em `public/docs` por documentos oficiais revisados.
2. Revisar o subprojeto legado `app/admin` antes de qualquer remocao ou merge estrutural.

## Bloqueios de producao

- Nao executar deploy, push, alteracoes Supabase Dashboard, SQL destrutivo ou mudancas criticas de RLS sem revisao especifica.
