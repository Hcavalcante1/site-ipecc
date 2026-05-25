# Roadmap Enterprise Local/Staging

Este roadmap orienta batches seguros para elevar o projeto IPECC ao padrao enterprise em ambiente local/staging, sem publicar, sem operacoes destrutivas e preservando o fluxo publico, admin e compatibilidade legado.

## Principios operacionais

1. Segurança antes de conveniencia: nao versionar novos segredos, nao executar SQL destrutivo, nao alterar producao.
2. Estabilidade incremental: preferir batches pequenos com validacao objetiva e rollback simples.
3. Integridade documental: cada mudanca operacional deve atualizar runbooks, checklists ou scripts quando aplicavel.
4. Preservacao institucional: manter conteudo e visual publico aprovado, evitando refactors esteticos amplos.
5. Compatibilidade legado: manter fallback hibrido e fluxos existentes ate haver plano validado de substituicao.

## Trilhas priorizadas

### 1. Segurança e configuracao

- Manter `.gitignore` cobrindo artefatos locais, builds e arquivos `.env` de maquina.
- Criar exemplos sanitizados para variaveis de ambiente quando ajustes de setup forem necessarios.
- Documentar qualquer SQL somente como checklist reversivel e nao destrutivo.
- Auditar uso de chaves publicas/anônimas em componentes cliente antes de ampliar CMS.

### 2. Estabilidade e validacao local

- Rodar `npx tsc --noEmit` em todos os batches.
- Rodar `npm run validar:enterprise` em batches operacionais, documentais ou estruturais.
- Rodar `npm run build` quando houver alteracao de layout global, rotas, config Next.js ou componentes compartilhados.
- Usar browser smoke quando tocar em paginas publicas, admin ou jornada de proposta.

### 3. Documentacao e runbooks

- Manter runbook local/staging atualizado.
- Registrar checklists por tipo de batch.
- Documentar decisoes de risco: storage, anexos, RLS, admin/CMS e observabilidade.

### 4. Publico e visual premium

- Evoluir paginas publicas com componentes pequenos e acessiveis.
- Preservar textos institucionais e hierarquia visual ja aprovada.
- Validar responsividade e navegacao basica antes de commit.

### 5. Admin/CMS

- Padronizar estados de loading, erro e vazio sem alterar contratos de dados.
- Consolidar clientes Supabase somente depois de mapear impacto.
- Evitar alteracao de RLS critica sem plano e scripts de validacao.

### 6. Observabilidade e performance

- Adicionar verificacoes locais de saude e smoke tests.
- Revisar imagens, fontes e payloads publicos quando houver build confiavel.
- Documentar metricas locais antes de qualquer preparacao para producao.

## Backlog recomendado

1. Criar `.env.local.example` sanitizado para o site publico sem remover arquivos locais existentes.
2. Adicionar scripts de auditoria de anexos/propostas em modo read-only.
3. Padronizar um smoke local HTTP usando `scripts/check-site.mjs`.
4. Mapear tabelas e buckets Supabase esperados em documento de contrato local/staging.
5. Revisar componentes admin de propostas com foco em estados de erro e links de anexo.
