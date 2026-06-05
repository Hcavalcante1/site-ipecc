# Especificacao da tela: governanca do edital

## Objetivo da tela

Criar uma area interna para acompanhar e controlar o ciclo institucional de cada edital, sem automatizar a decisao humana.

Rota proposta:

```text
/admin/editais/[id]/governanca
```

## Principio

A tela deve servir como painel de controle do edital.

Ela nao decide quem aprova, reprova, vence ou perde. Ela apenas:

- mostra a fase atual;
- organiza documentos;
- registra decisoes humanas;
- alerta pendencias;
- gera historico institucional;
- publica informacoes oficiais quando autorizado.

## Estrutura visual recomendada

### 1. Cabecalho do edital

Informacoes:

- titulo do edital;
- tipo;
- status publico atual;
- fase institucional atual;
- periodo de recebimento;
- link para pagina publica do edital;
- link para PDF principal.

Acoes:

- voltar para lista de editais;
- editar edital;
- visualizar publico.

### 2. Card de fase atual

Mostrar de forma destacada:

- fase atual;
- data da ultima mudanca;
- usuario que fez a ultima mudanca;
- observacao da ultima mudanca, se existir.

Botao:

```text
Avancar fase
```

O botao deve abrir uma confirmacao antes de salvar.

### 3. Checklist da fase

Mostrar pendencias conforme fase.

Exemplos:

#### Fase `rascunho`

- PDF principal anexado;
- titulo preenchido;
- descricao preenchida;
- periodo definido.

#### Fase `publicado`

- edital publicado no site;
- prazo de recebimento definido;
- documentos complementares anexados, se houver.

#### Fase `recebimento_propostas`

- periodo de recebimento ativo;
- link de envio de proposta funcionando;
- propostas recebidas listadas.

#### Fase `analise`

- propostas recebidas fechadas;
- analise humana em andamento;
- documentos das propostas disponiveis.

#### Fase `resultado_preliminar`

- documento de resultado preliminar publicado;
- prazo de recurso definido.

#### Fase `recurso`

- prazo de recurso aberto;
- recursos recebidos registrados;
- documentos de recurso organizados.

#### Fase `julgamento_recurso`

- julgamentos registrados;
- parecer/ata de julgamento anexado.

#### Fase `resultado_final`

- documento de resultado final publicado.

#### Fase `homologado`

- documento de homologacao publicado.

#### Fase `contratado`

- contrato ou termo publicado;
- contratado identificado;
- datas preenchidas.

#### Fase `execucao`

- documentos de execucao organizados;
- acompanhamento ativo.

#### Fase `prestacao_contas`

- documentos de prestacao publicados;
- pareceres ou aprovacoes anexados, quando houver.

#### Fase `encerrado`

- documento de encerramento publicado;
- historico completo.

## Avanco manual de fase

Ao clicar em avancar fase, abrir formulario com:

- fase nova;
- observacao obrigatoria;
- checkbox de confirmacao;
- resumo das pendencias.

Texto recomendado:

```text
Confirmo que esta mudanca de fase representa uma decisao humana e institucional, conforme documentos e criterios do edital.
```

Regras:

- nao avancar sem confirmacao;
- nao avancar sem observacao;
- registrar log;
- atualizar `fase_atual`;
- nao apagar documentos anteriores.

## Documentos do edital

Bloco para publicar documento por fase.

Campos:

- tipo do documento;
- fase relacionada;
- titulo;
- descricao opcional;
- arquivo PDF;
- publicado: sim/nao.

Tipos:

```text
edital
anexo
ata
parecer
recurso
julgamento
resultado_preliminar
resultado_final
homologacao
adjudicacao
contrato
termo_parceria
prestacao_de_contas
encerramento
```

Regras:

- aceitar somente PDF para documentos oficiais;
- exibir link de download depois do upload;
- registrar log ao publicar;
- documentos nao publicados ficam apenas no admin.

## Propostas vinculadas

Bloco para listar propostas do edital.

Campos exibidos:

- nome;
- e-mail;
- telefone;
- tipo de pessoa;
- categoria;
- status;
- anexos;
- data de envio.

Acoes:

- ver detalhes;
- marcar status manual;
- abrir anexos.

Status sugeridos:

```text
pendente
em_analise
habilitada
inabilitada
aprovada
rejeitada
```

Importante:

A tela pode registrar status, mas nao deve calcular aprovacao automaticamente.

## Historico institucional

Mostrar logs em ordem cronologica.

Cada linha:

- data;
- usuario;
- acao;
- fase anterior;
- fase nova;
- documento publicado;
- observacao.

Exemplos de acao:

```text
fase_alterada
documento_publicado
proposta_status_alterado
prazo_recurso_definido
contrato_publicado
prestacao_publicada
edital_encerrado
```

## Regras de seguranca

- tela acessivel apenas para admin logado;
- todas as gravacoes via rota admin protegida;
- nunca usar service role no client;
- nao expor dados sensiveis em erro;
- nao permitir upload fora dos buckets permitidos;
- nao permitir path manual perigoso.

## Impacto publico

Depois da tela estar funcionando, os dados poderao alimentar:

- timeline em `/editais/[id]`;
- status em `/editais`;
- blocos de transparencia;
- documentos publicos do edital.

## Criterios para aprovar a tela

A tela so deve ser considerada pronta quando:

- abrir edital existente;
- mostrar fase atual;
- avancar fase com log;
- publicar documento PDF;
- listar documentos publicados;
- listar propostas vinculadas;
- nao quebrar `/editais`;
- nao quebrar `/transparencia`;
- build passar;
- typecheck passar.

## Primeira versao recomendada

Implementar primeiro apenas:

- cabecalho do edital;
- fase atual;
- avancar fase;
- documentos oficiais;
- historico/logs.

Depois adicionar:

- checklist completo;
- propostas vinculadas;
- integracao publica da timeline;
- bloqueios por fase.
