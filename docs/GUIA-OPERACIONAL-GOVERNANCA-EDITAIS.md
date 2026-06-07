# Guia operacional: governanca de editais e chamamentos

## Objetivo

Este guia explica como operar o fluxo atual de editais, propostas, governanca e transparencia no site IPECC.

O sistema organiza o processo, mas a decisao continua humana e institucional.

## Fluxo atual

1. O edital nasce no admin em `Editais`.
2. O PDF oficial do edital aparece na pagina publica `/editais`.
3. A governanca do edital e controlada em `Governanca / fases`.
4. Propostas publicas sao enviadas em `/propostas` e vinculadas a um edital aberto.
5. Documentos de resultado, recurso, homologacao, contrato e prestacao de contas sao publicados pela governanca.
6. A pagina publica `/transparencia` exibe os documentos e fases publicas da governanca.

## Fluxo institucional (fechado)

### Fase Rascunho — sandbox de testes

- edital **nao** aparece em `/editais` nem em `/editais/[id]`;
- para testar envio em `/propostas`: manter fase Rascunho e status **Aberto** no admin;
- propostas ficam com referencia ao edital; **Aprovar** = vinculo oficial; **Rejeitar** = historico;
- **Excluir** permitido (propostas desvinculadas, mas permanecem em Admin > Propostas).

### Processo real (apos sair de Rascunho)

- edital passa a aparecer no site publico conforme a fase;
- envio em `/propostas` so na fase **Recebimento de propostas**;
- **Excluir** bloqueado — encerrar pela governanca;
- transparencia e auditoria preservadas.

## Onde cada coisa aparece

### Pagina publica Editais

Uso:

- divulgar o edital aberto;
- exibir titulo, descricao, periodo e PDF oficial;
- permitir leitura/download do edital.

Nao deve exibir:

- fase interna em rascunho;
- analise tecnica interna;
- historico administrativo;
- decisoes ainda nao publicadas.

### Pagina publica Transparencia

Uso:

- publicar a evolucao institucional do edital;
- exibir resultado preliminar;
- exibir periodo/fase de recursos;
- exibir julgamento de recursos;
- exibir resultado final;
- exibir homologacao;
- exibir contrato ou termo;
- exibir documentos de execucao e prestacao de contas.

Regra importante:

- edital em fase `rascunho` nao aparece publicamente na Transparencia.

### Admin Editais

Uso:

- cadastrar edital;
- editar dados basicos;
- anexar PDF oficial;
- acessar governanca/fases;
- excluir edital quando necessario (somente testes ou cadastro incorreto).

Regras de exclusao:

- exclusao permitida **somente** na fase `rascunho`;
- em rascunho, propostas vinculadas sao desvinculadas ao excluir, mas permanecem no admin;
- apos avancar fase na governanca, exclusao bloqueada — usar encerramento.

Testes de proposta em rascunho:

- status do edital = `aberto` habilita o edital no formulario `/propostas` (nao listado em `/editais`);
- processo real: avancar para fase `recebimento_propostas` na governanca.

Protecoes de producao:

- envio de proposta validado no servidor (`POST /api/propostas/enviar`);
- voltar para Rascunho bloqueado se houver proposta aprovada;
- exclusao de edital remove PDF do storage quando possivel;
- retorno para Rascunho registrado em `editais_logs`.

### Admin Governanca / fases

Uso:

- ver fase atual;
- ver visibilidade publica;
- consultar proximo passo sugerido;
- avancar fase manualmente;
- registrar observacao institucional;
- publicar documentos oficiais;
- excluir documentos ou logs de teste;
- acompanhar propostas vinculadas;
- usar **Ver edital** em Admin > Propostas antes de aprovar ou rejeitar.

## Fases do processo

As fases atuais sao:

1. Rascunho
2. Publicado
3. Recebimento de propostas
4. Analise tecnica
5. Resultado preliminar
6. Recursos
7. Julgamento dos recursos
8. Resultado final
9. Homologacao
10. Adjudicacao
11. Contrato / termo
12. Execucao
13. Prestacao de contas
14. Encerramento

## Quando sair de rascunho

A fase `rascunho` deve ser usada enquanto o edital ainda esta em preparacao interna.

O edital deve sair de `rascunho` somente quando:

- o edital foi revisado internamente;
- o PDF oficial esta correto;
- a publicacao foi autorizada;
- o responsavel institucional confirmou que o edital pode entrar no fluxo publico.

Ao sair de `rascunho`, o operador deve:

1. selecionar a nova fase;
2. preencher a observacao institucional;
3. marcar a confirmacao de decisao humana;
4. confirmar a acao no modal.

## O que automatizar

O sistema pode automatizar:

- exibicao da fase atual;
- exibicao do proximo passo sugerido;
- vinculo de propostas ao edital;
- resumo de propostas por status;
- exibicao publica de documentos ja publicados;
- ocultacao de rascunhos no publico;
- logs institucionais de mudanca de fase e documento publicado.

## O que nao automatizar

O sistema nao deve automatizar:

- aprovacao de proposta;
- resultado tecnico;
- julgamento de recurso;
- homologacao;
- contratacao;
- encerramento institucional.

Essas decisoes dependem de analise humana, criterio do edital e validacao institucional.

## Operacao recomendada

### Publicar edital

1. Acessar `/admin/editais`.
2. Cadastrar ou editar o edital.
3. Confirmar titulo, descricao, periodo e PDF.
4. Abrir `Governanca / fases`.
5. Mudar a fase de `Rascunho` para `Publicado`, quando autorizado.
6. Conferir `/editais`.

### Abrir recebimento de propostas

1. Abrir a governanca do edital.
2. Mudar a fase para `Recebimento de propostas`.
3. Conferir se o edital aparece no formulario `/propostas`.
4. Receber propostas normalmente.

### Publicar resultado preliminar

1. Fazer a analise humana das propostas.
2. Preparar PDF oficial do resultado preliminar.
3. Abrir a governanca do edital.
4. Publicar documento com tipo `Resultado preliminar`.
5. Mudar fase para `Resultado preliminar`.
6. Conferir `/transparencia`.

### Publicar resultado final e homologacao

1. Encerrar recursos e julgamento, quando houver.
2. Publicar documentos correspondentes.
3. Avancar fase manualmente.
4. Registrar observacao institucional.
5. Conferir `/transparencia`.

### Prestacao de contas

1. Publicar documentos oficiais de execucao/prestacao de contas.
2. Vincular ao edital correto.
3. Conferir se aparece na Transparencia.

## Checklist de validacao rapida

Antes de considerar um edital publicado:

- PDF oficial abre em `/editais`;
- fase nao esta mais em `rascunho`, se deve aparecer publicamente;
- proposta publica aparece apenas para edital em fase adequada;
- documento oficial abre em nova aba;
- Transparencia nao mostra informacao interna;
- historico institucional registra as mudancas;
- documentos de teste foram removidos.

## Regra de seguranca operacional

Se houver duvida sobre uma fase, nao avance automaticamente.

Mantenha em `rascunho` ou na fase atual, registre observacao e valide com o responsavel institucional.

