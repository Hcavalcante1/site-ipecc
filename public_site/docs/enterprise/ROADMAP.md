# Roadmap enterprise local/staging - IPECC

Este roadmap orienta batches incrementais e seguros para evoluir o projeto sem acionar producao, deploys ou alteracoes destrutivas.

## Principios de execucao

- Priorizar seguranca, estabilidade e integridade documental.
- Manter compatibilidade legado, fallback hibrido e conteudo institucional.
- Executar validacoes locais antes de cada commit relevante.
- Documentar qualquer passo externo como checklist ou runbook antes de pedir acao manual.
- Nao executar deploy, SQL destrutivo, alteracao em producao ou troca de chaves reais.

## Estado atual observado

- Aplicacao Next.js em `public_site`.
- Admin e paginas publicas convivem no mesmo app.
- Supabase e usado para editais, propostas e anexos.
- Validacoes locais enterprise adicionadas em scripts somente leitura.

## Trilhas priorizadas

### 1. Seguranca e estabilidade

- Manter `npx tsc --noEmit` como gate minimo.
- Evoluir `npm run validar:enterprise` para verificar invariantes de configuracao, docs e scripts.
- Ampliar auditorias para detectar uso indevido de envs, rotas criticas e comandos destrutivos.

### 2. Integridade documental e anexos

- Preservar upload e leitura dos anexos de propostas.
- Expandir `audit:anexos` para cobrir repositorios/documentos quando o modulo ganhar persistencia.
- Documentar buckets, tabelas e politicas esperadas em runbook local/staging antes de qualquer mudanca de RLS.

### 3. Publico e visual premium

- Fazer melhorias visuais apenas com smoke local.
- Preservar texto institucional aprovado e navegacao publica.
- Usar `check:http` para crawl local quando houver alteracoes de paginas ou layout.

### 4. Admin/CMS

- Melhorar estados vazios, erro e carregamento sem alterar contratos de dados.
- Padronizar componentes administrativos de forma incremental.
- Evitar remocao de fluxos existentes ate haver substituto validado.

### 5. Observabilidade local/staging

- Padronizar mensagens de erro e logs client/server sem expor dados sensiveis.
- Criar checks de saude locais para rotas publicas e administrativas.
- Documentar diagnostico de falhas recorrentes.

### 6. Performance e preparacao para producao

- Executar `npm run build` apos mudancas estruturais.
- Revisar assets e carregamento de paginas publicas sem mudar conteudo.
- Preparar checklists de producao sem publicar.

## Proximos batches recomendados

1. Corrigir erros TypeScript encontrados pelo gate atual, mantendo comportamento.
2. Expandir runbook de variaveis e Supabase local/staging com placeholders seguros.
3. Adicionar smoke HTTP automatizado para rotas publicas principais.
4. Mapear modulo admin em checklist de estabilidade e estados de erro.
