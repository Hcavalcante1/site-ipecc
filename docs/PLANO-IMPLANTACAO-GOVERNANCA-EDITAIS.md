# Plano de implantacao: governanca de editais

## Objetivo

Implantar o novo fluxo de governanca de editais sem quebrar o funcionamento atual de:

- editais publicos;
- envio de propostas;
- admin de propostas;
- transparencia;
- downloads;
- storage;
- prestacao de contas.

## Regra central

O edital sera o processo principal. As decisoes continuam humanas, mas o sistema passa a organizar fases, documentos, prazos, logs e publicacao.

## Etapa 0 - Aprovacao tecnica

Antes de alterar producao:

- revisar `docs/PROJETO-GOVERNANCA-EDITAIS.md`;
- revisar `docs/sql/governanca-editais-fase-1-PROPOSTA.sql`;
- confirmar se as fases propostas atendem aos editais reais do IPECC;
- confirmar se a palavra "adjudicacao" deve aparecer publicamente ou apenas internamente;
- confirmar se todos os editais exigem contrato ou se alguns usam termo de parceria.

Resultado esperado:

- aprovacao do modelo;
- nenhum codigo alterado;
- nenhum SQL executado.

## Etapa 1 - Base de dados minima

Aplicar, somente apos aprovacao, a base minima:

- `fase_atual` em `editais`;
- datas de publicacao, recebimento e encerramento;
- `edital_id` em `propostas`;
- `documentos_publicos`;
- `editais_logs`.

Arquivo de referencia:

- `docs/sql/governanca-editais-fase-1-PROPOSTA.sql`

Validacoes:

- editar edital antigo sem erro;
- criar edital novo sem erro;
- enviar proposta publica sem erro;
- listar transparencia sem erro;
- baixar documentos sem erro.

## Etapa 2 - Admin de governanca por edital

Criar uma tela nova sem substituir as existentes:

```text
/admin/editais/[id]/governanca
```

Funcoes da tela:

- exibir fase atual;
- mostrar checklist da fase;
- permitir avancar fase manualmente;
- registrar observacao da mudanca;
- publicar documento por fase;
- listar documentos do edital;
- listar propostas vinculadas;
- exibir historico/logs.

Arquivos provaveis:

- `app/admin/editais/[id]/governanca/page.tsx`;
- helpers em `lib/editais/`, se necessario;
- ajuste pequeno em `app/admin/editais/[id]/page.tsx` para linkar "Governanca".

O que nao fazer nesta etapa:

- nao trocar a pagina publica;
- nao bloquear proposta ainda;
- nao remover telas atuais de transparencia.

Validacoes:

- abrir governanca de edital existente;
- avancar fase em edital de teste;
- publicar documento PDF de teste;
- conferir log criado;
- conferir que admin atual continua funcionando.

## Etapa 3 - Documentos oficiais por fase

Padronizar documentos do processo:

- edital;
- anexo;
- ata;
- parecer;
- recurso;
- julgamento;
- resultado preliminar;
- resultado final;
- homologacao;
- adjudicacao;
- contrato;
- termo de parceria;
- prestacao de contas;
- encerramento.

Regras:

- aceitar PDF para documentos oficiais;
- vincular cada documento a um edital;
- vincular documento a uma fase quando fizer sentido;
- manter URL de download segura;
- registrar log ao publicar documento.

Validacoes:

- upload de PDF;
- abertura em nova aba;
- download funcionando;
- documento aparece no admin;
- documento aparece apenas se `publicado = true`.

## Etapa 4 - Timeline publica do edital

Adicionar linha do tempo em:

```text
/editais/[id]
```

Exibir:

- fase atual;
- publicacao;
- recebimento de propostas;
- analise tecnica;
- resultado preliminar;
- recursos;
- julgamento dos recursos;
- resultado final;
- homologacao;
- contrato;
- execucao;
- prestacao de contas;
- encerramento.

Importante:

- a timeline nao deve dizer que uma decisao foi automatica;
- deve deixar claro que analise e julgamento sao etapas institucionais;
- documentos so aparecem quando publicados.

Validacoes:

- edital sem documentos nao quebra;
- edital com documentos mostra timeline;
- mobile legivel;
- desktop alinhado ao layout atual;
- SEO nao deve ser prejudicado.

## Etapa 5 - Regras de proposta por fase

Depois que a governanca estiver testada, aplicar regras no envio de propostas:

- permitir envio apenas na fase `recebimento_propostas`;
- bloquear envio apos prazo final;
- exibir mensagem clara quando o edital estiver fora do periodo;
- manter proposta manual, sem analise automatica.

Arquivos provaveis:

- `app/propostas/page.tsx`;
- possivelmente helper em `lib/editais/`.

Validacoes:

- envio dentro do prazo funciona;
- envio fora do prazo mostra mensagem;
- proposta fica vinculada ao edital;
- anexos continuam funcionando.

## Etapa 6 - Transparencia integrada

Conectar a pagina de transparencia ao processo oficial.

Manter compatibilidade com tabelas atuais:

- `transparencia_editais`;
- `transparencia_convenios`;
- `transparencia_prestacao_contas`.

Evoluir gradualmente para:

- documentos oficiais por edital;
- contratos/termos vinculados ao edital;
- prestacao de contas vinculada ao contrato/termo.

O que evitar:

- nao apagar dados antigos;
- nao substituir tudo de uma vez;
- nao esconder documentos ja publicados.

Validacoes:

- `/transparencia` continua abrindo;
- documentos antigos continuam visiveis;
- novos documentos aparecem na estrutura correta;
- downloads continuam funcionando.

## Etapa 7 - Relatorios e dashboard

Depois do fluxo funcionar, adicionar indicadores:

- editais por fase;
- propostas por edital;
- documentos pendentes;
- contratos em execucao;
- prestacoes de contas pendentes;
- acoes recentes por usuario.

Esses dados ajudam gestao, mas nao sao obrigatorios para a primeira versao.

## Ordem segura de commits futura

Quando a implementacao for autorizada, a ordem ideal sera:

1. `docs(governanca): registrar arquitetura de editais`
2. `db(governanca): adicionar proposta sql da fase 1`
3. `feat(admin): criar governanca manual de editais`
4. `feat(public): exibir timeline publica de editais`
5. `feat(propostas): vincular envio ao edital e fase`
6. `feat(transparencia): integrar documentos oficiais`
7. `chore(governanca): adicionar relatorios operacionais`

## Go/no-go por etapa

Cada etapa so deve avancar se:

- build passar;
- typecheck passar;
- admin abrir;
- edital salvar;
- proposta enviar;
- downloads abrirem;
- transparencia renderizar;
- `.env.local` continuar fora do commit.

## Recomendacao

Executar em blocos pequenos.

A primeira implementacao real deve ser apenas a base de dados e uma tela admin interna de governanca. A timeline publica e os bloqueios de proposta devem vir depois, quando o fluxo estiver validado por um edital de teste.
