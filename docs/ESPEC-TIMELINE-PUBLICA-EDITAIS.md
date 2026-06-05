# Especificacao: timeline publica de editais

## Objetivo

Criar uma linha do tempo publica para cada edital, mostrando o andamento institucional do processo de forma clara, auditavel e facil de entender.

Pagina proposta:

```text
/editais/[id]
```

## Principio

A timeline publica deve informar o andamento do edital, mas sem sugerir que decisoes foram automaticas.

Toda decisao deve ser apresentada como ato institucional:

- analise tecnica;
- resultado preliminar;
- recurso;
- julgamento;
- resultado final;
- homologacao;
- contratacao;
- execucao;
- prestacao de contas;
- encerramento.

## Estrutura da timeline

### 1. Cabecalho do edital

Exibir:

- titulo do edital;
- tipo;
- fase atual;
- periodo de recebimento;
- status publico;
- botao para baixar edital;
- botao para enviar proposta, somente quando permitido.

## Fases publicas

### 1. Publicacao

Mostrar:

- data de publicacao;
- PDF do edital;
- anexos oficiais, quando houver.

Texto recomendado:

```text
Edital publicado oficialmente pelo IPECC.
```

### 2. Recebimento de propostas

Mostrar:

- data inicial;
- data final;
- situacao: aberto, encerrado ou em breve.

Regra publica:

- se estiver aberto, mostrar botao de envio;
- se estiver encerrado, mostrar mensagem clara;
- se ainda nao abriu, mostrar data prevista.

### 3. Analise tecnica

Mostrar:

```text
As propostas recebidas estao em analise pela equipe responsavel, conforme criterios do edital.
```

Nao mostrar:

- pontuacao automatica;
- ranking automatico;
- decisao sem documento.

### 4. Resultado preliminar

Mostrar:

- documento de resultado preliminar;
- data de publicacao;
- observacoes, se houver.

### 5. Recursos

Mostrar:

- prazo inicial;
- prazo final;
- documentos/instrucoes de recurso, se houver;
- situacao: aberto ou encerrado.

### 6. Julgamento dos recursos

Mostrar:

- ata, parecer ou documento de julgamento;
- data de publicacao.

### 7. Resultado final

Mostrar:

- documento de resultado final;
- data de publicacao.

### 8. Homologacao

Mostrar:

- documento de homologacao;
- data de homologacao.

### 9. Adjudicacao

Mostrar somente quando aplicavel.

Campos:

- documento de adjudicacao;
- beneficiario/adjudicatario, se publicado;
- observacoes.

### 10. Contrato ou termo de parceria

Mostrar:

- numero do contrato/termo;
- contratado/parceiro;
- CNPJ, quando publico;
- objeto;
- vigencia;
- documento de contrato ou termo.

### 11. Execucao

Mostrar:

- status da execucao;
- documentos de acompanhamento;
- relatorios, quando publicados.

### 12. Prestacao de contas

Mostrar:

- documentos de prestacao;
- pareceres;
- termos de aprovacao;
- pendencias, se publicadas.

### 13. Encerramento

Mostrar:

- documento de encerramento;
- data de encerramento;
- situacao final.

## Estados visuais da timeline

Cada fase deve ter um estado:

```text
concluida
atual
pendente
nao_aplicavel
```

### Concluida

Fase com documento ou data oficial publicada.

### Atual

Fase igual a `fase_atual` do edital.

### Pendente

Fase futura sem publicacao.

### Nao aplicavel

Fase que nao se aplica ao edital, por exemplo adjudicacao.

## Regras do botao "Enviar proposta"

O botao so deve aparecer quando:

- edital estiver publicado;
- fase atual for `recebimento_propostas`;
- data atual estiver dentro do periodo permitido;
- edital estiver ativo.

Se nao puder enviar, exibir mensagem:

```text
O periodo de envio de propostas nao esta aberto para este edital.
```

## Regras de documentos

Mostrar somente documentos com:

- `publicado = true`;
- arquivo valido;
- vinculo com o edital.

Documentos em rascunho devem aparecer apenas no admin.

## Integracao com transparencia

A timeline do edital e a pagina de transparencia devem se complementar.

Uso recomendado:

- `/editais/[id]`: mostra a historia daquele edital especifico;
- `/transparencia`: mostra documentos institucionais agrupados por tema, convenio, contrato e prestacao de contas.

## SEO

A pagina do edital deve manter:

- titulo unico;
- descricao com nome do edital;
- canonical para `https://www.ipecc.org.br/editais/[id]`;
- sem `noindex`;
- documentos oficiais com links rastreaveis.

## Acessibilidade

Requisitos:

- fases em ordem logica;
- contraste alto;
- texto legivel no mobile;
- links com nome claro;
- botoes com texto objetivo;
- documentos abrindo em nova aba quando fizer sentido.

## Primeira versao recomendada

Implementar primeiro:

- fase atual;
- lista simples de etapas;
- documentos publicados por fase;
- botao de proposta controlado por fase;
- mensagem clara quando proposta estiver fechada.

Depois evoluir para:

- visual mais rico;
- filtros;
- historico completo;
- integracao com contratos e prestacao de contas.

## Criterios de aceite

A timeline sera considerada pronta quando:

- edital antigo abrir sem erro;
- edital sem documentos nao quebrar;
- edital com documentos mostrar fases;
- botao de proposta respeitar fase e prazo;
- downloads funcionarem;
- mobile estiver legivel;
- build passar;
- typecheck passar.
