# Diagnostico e cronograma de producao

Atualizado: 2026-06-01

## Diagnostico executivo

O projeto esta em fase de pre-producao / homologacao final. A base tecnica principal esta madura: site publico em Next.js 14, area admin, integracao Supabase, fluxo de propostas, migracao `proposta_anexos` validada em staging, hardening de seguranca documentado, scripts de validacao e runbooks operacionais.

O estado atual nao parece ser de desenvolvimento inicial. O projeto esta no ponto de fechamento de conteudo, aceite visual, repeticao de gates tecnicos, preparacao de ambiente de producao e go-live controlado.

## Evidencias observadas

- `docs/ENTERPRISE-STATUS.md` indica staging local validado, gates enterprise, Fase 4 WhatsApp com DoD local OK e producao ainda congelada.
- `docs/PUSH-PACKAGE-LOCAL.md` indica push em `main`, remote `origin` e espelho `site-ipecc` alinhado em 2026-05-26.
- `docs/VISUAL-GO-LIVE-CHECKLIST.md` classifica o go-live visual de codigo/layout como aprovado com ressalvas.
- `docs/PROD-PREP-CHECKLIST.md` define que producao so deve ser aberta apos autorizacao explicita, validacoes, Supabase prod, flags e smoke pos-deploy.
- A pasta `reports/` contem evidencias de auditoria de anexos, enterprise guard e WhatsApp Meta.
- `package.json` possui scripts robustos para typecheck, build, seguranca, publico, admin, enterprise, WhatsApp e migracao de anexos.
- Em 2026-06-01, `tsc --noEmit` e `next build` foram executados com sucesso pelo caminho interno do ambiente.

## Status por frente

| Frente | Status | Diagnostico |
|---|---|---|
| Site publico | Quase pronto | Estrutura e rotas principais prontas; falta aceite humano de `/`, `/inicio`, mobile real e conteudo final. |
| Admin | Funcional | Rotas admin amplas e padronizacao parcial; consolidacao de rotas de editais fica como backlog ou pos-go-live. |
| Supabase staging | Validado | Anexos, upload, RLS e migracao foram validados em staging/local segundo os documentos. |
| Supabase producao | Pendente | Checklist manual ainda precisa ser executado no projeto correto de producao. |
| Propostas/anexos | Pronto em staging | `proposta_anexos` M1-M4 validado; producao depende de aplicacao cuidadosa, flags e smoke. |
| WhatsApp | Codigo avancado | Fases 1-4 possuem validacoes locais; ainda ha validacao manual/admin/Meta real a concluir conforme escopo de release. |
| Conteudo CMS | Principal pendencia | Existem ressalvas historicas sobre textos, registros de teste, IPECC vs APECC e revisao institucional. |
| CI/validacao | Estruturado | Scripts existem; repetir gates no ambiente normal antes do corte. |
| Producao | Congelada | Go-live depende de decisao explicita da equipe. |

## Riscos principais

1. Ambiente de producao errado: executar SQL, flags ou scripts com `.env.local` apontando para o projeto errado pode causar alteracoes indevidas.
2. Conteudo publico incompleto: textos de teste, copy placeholder ou divergencia IPECC/APECC podem ir ao ar se nao houver revisao humana.
3. Flags de anexos em producao: ativar fases B/C antes dos smokes pode quebrar upload/download ou leitura admin.
4. WhatsApp real: validacoes locais nao substituem teste com Meta/ngrok/admin quando essa frente fizer parte do go-live.
5. Documentacao divergente: documentos antigos ainda citam ausencia de push/origin; usar `ENTERPRISE-STATUS.md` e `PUSH-PACKAGE-LOCAL.md` como fontes mais recentes.
6. Acesso a producao: o `.env.local` observado aponta para o Supabase ref `eohshxaxbsdpxundsley`, documentado no projeto como staging. Antes de qualquer acao de producao, confirmar o ref/URL correto do Supabase e do host de deploy.

## Criterio de pronto para go-live

O projeto so deve ser considerado pronto para producao quando todos os pontos abaixo estiverem fechados:

- Conteudo final revisado e aprovado pela equipe.
- Visual aprovado em desktop e celular real.
- `npm run validar:release-prep`, `npm run validar:seguranca`, `npm run ci:local`, `npm run validar:publico`, `npm run validar:admin` e `npm run guard:enterprise` executados com sucesso.
- Supabase producao configurado com bucket privado, RLS e politicas corretas.
- Variaveis de ambiente reais cadastradas no host de deploy.
- Flags `USE_PROPOSTA_ANEXOS_*` ativadas por fase, com smoke apos cada mudanca.
- Smoke pos-deploy aprovado: `/propostas`, envio PDF teste, admin, download admin, download anonimo bloqueado.
- Responsavel e data do go-live registrados na documentacao.

## Cronograma de producao

### Etapa 1 - Congelar escopo e saneamento documental

Duracao sugerida: 0,5 dia.

Objetivo: confirmar o que entra no primeiro go-live e alinhar documentos.

Entregas:
- Definir se WhatsApp real entra no go-live inicial ou fica como fase posterior.
- Confirmar que a fonte de status sera `docs/ENTERPRISE-STATUS.md`.
- Atualizar ou anotar documentos antigos que ainda citam "sem remote/sem push".
- Definir responsaveis por conteudo, tecnico, Supabase e aprovacao final.

### Etapa 2 - Revisao de conteudo e CMS

Duracao sugerida: 1 a 2 dias.

Objetivo: remover conteudo de teste e fechar copy institucional.

Entregas:
- Revisar `/`, `/inicio`, `/projetos`, `/projetos/*`, `/quem-somos`, `/transparencia`, `/editais`, `/noticias`, `/eventos`, `/contato`.
- Corrigir IPECC vs APECC onde for necessario.
- Corrigir textos de hero, virgulas duplas e placeholders.
- Confirmar editais e documentos reais ou ocultar rascunhos.
- Rodar auditoria CMS em staging e obter 0 suspeitos.

Gate:
- `npm run auditar:cms-staging`
- Aceite humano das paginas publicas.

### Etapa 3 - QA visual e funcional publico

Duracao sugerida: 1 dia.

Objetivo: aprovar experiencia publica antes de mexer em producao.

Entregas:
- Validar desktop e mobile 375px.
- Validar celular real.
- Conferir menu, heroes, cards, formularios, tabelas, downloads e redirects.
- Validar `/portal -> /inicio` e `/apresentacao -> /`.

Gate:
- `npm run validar:public-pages-padrao`
- `npm run validar:publico`
- `npm run validar:smoke-publico` com servidor local ativo.

### Etapa 4 - QA admin e propostas

Duracao sugerida: 1 dia.

Objetivo: garantir que a operacao interna esta pronta.

Entregas:
- Login admin.
- Listagem e detalhe de propostas.
- Auditoria de anexos.
- Download admin.
- Bloqueio de download anonimo.
- Validacao das rotas admin criticas.

Gate:
- `npm run validar:admin`
- `npm run audit:anexos`
- `npm run verify:proposta-anexos`

### Etapa 5 - Gates tecnicos finais em staging/local

Duracao sugerida: 0,5 a 1 dia.

Objetivo: repetir a bateria tecnica antes do corte.

Entregas:
- TypeScript OK.
- Build OK.
- Release prep OK.
- Seguranca OK.
- Enterprise guard OK.

Gate:
- `npm run validar:release-prep`
- `npm run validar:seguranca`
- `npm run ci:local`
- `npm run guard:enterprise`
- `npm run validar:enterprise-readiness`

### Etapa 6 - Preparar Supabase de producao

Duracao sugerida: 1 dia.

Objetivo: configurar dados, seguranca e storage no projeto correto de producao.

Entregas:
- Confirmar `ref` do projeto Supabase correto.
- Aplicar checklist de seguranca.
- Garantir bucket `propostas` privado.
- Revisar RLS de `propostas` e storage.
- Aplicar ou adaptar SQL de `proposta_anexos` para producao.
- Sincronizar e verificar anexos.

Gate:
- `npm run diag:supabase-env`
- `npm run sync:proposta-anexos`
- `npm run verify:proposta-anexos`
- `npm run validar:pre-m4-corte`

### Etapa 7 - Configurar host de deploy

Duracao sugerida: 0,5 dia.

Objetivo: deixar o ambiente de hospedagem pronto sem abrir publico antes da hora.

Entregas:
- Cadastrar variaveis obrigatorias no host.
- Confirmar `NEXT_PUBLIC_SUPABASE_URL`, anon key, service role, Resend e e-mails.
- Confirmar flags iniciais de `proposta_anexos`.
- Confirmar dominio e SEO canonico.
- Garantir que secrets nao estao versionados.

Gate:
- Build no host verde.
- CI remoto verde.

### Etapa 8 - Rollout controlado de flags

Duracao sugerida: 0,5 a 1 dia.

Objetivo: ativar a migracao de anexos em producao com reversibilidade.

Entregas:
- Fase A: leitura hibrida.
- Fase B: escrita dupla.
- Fase C: somente tabela, apenas apos validacoes.
- Plano de rollback pronto: desligar flags e voltar leitura legado.

Gate:
- Smoke apos cada fase.
- `npm run validar:m4-somente-tabela` antes da Fase C.

### Etapa 9 - Deploy e smoke pos-producao

Duracao sugerida: 0,5 dia.

Objetivo: publicar e provar que o fluxo essencial funciona.

Entregas:
- Deploy publicado.
- Smoke publico.
- Envio de PDF teste.
- Admin visualiza proposta.
- Download admin OK.
- Download anonimo bloqueado.
- Auditoria 0 orfaos.

Gate:
- `/propostas` 200.
- Upload PDF completo.
- `/admin/propostas` OK com sessao.
- `/api/download/...` anonimo 401/403.
- `npm run audit:anexos` com ambiente correto.

### Etapa 10 - Pos-go-live e estabilizacao

Duracao sugerida: 2 a 5 dias de acompanhamento leve.

Objetivo: acompanhar operacao real e corrigir pequenos ajustes.

Entregas:
- Registrar data, responsavel e notas de producao.
- Remover dados de teste.
- Monitorar logs, formularios, anexos e e-mails.
- Rodar guard diario.
- Priorizar backlog pos-go-live.

Backlog recomendado:
- Unificar rotas admin de editais.
- Signed URLs com TTL.
- Cache/revalidate de paginas publicas.
- Pentest, backup e disaster recovery.
- WhatsApp real completo, caso nao entre no primeiro go-live.

## Linha do tempo sugerida

| Dia | Foco |
|---|---|
| Dia 1 | Escopo, saneamento documental e revisao inicial de conteudo |
| Dia 2 | Fechamento CMS/copy e auditoria de conteudo |
| Dia 3 | QA visual publico, mobile e admin |
| Dia 4 | Gates tecnicos finais e preparacao Supabase producao |
| Dia 5 | Host, flags, deploy controlado e smoke pos-deploy |
| Dias 6-10 | Estabilizacao, monitoramento e backlog critico |

## Recomendacao final

Seguir com producao somente apos aceite formal da equipe. Tecnicamente, o projeto esta em fase avancada; a maior parte do risco restante esta em conteudo, configuracao correta de producao, variaveis/flags e validacao humana final.
