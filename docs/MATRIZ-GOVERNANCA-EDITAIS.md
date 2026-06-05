# Matriz de implantacao: governanca de editais

## Objetivo

Organizar a implantacao do modulo de governanca por blocos pequenos, com dependencia clara entre banco, admin, publico e transparencia.

## Matriz geral

| Bloco | Entrega | Banco | Admin | Publico | Risco |
| --- | --- | --- | --- | --- | --- |
| 1 | Base de governanca | Sim | Nao | Nao | Baixo |
| 2 | Tela interna do edital | Usa base | Sim | Nao | Baixo/medio |
| 3 | Documentos oficiais | Usa base | Sim | Parcial | Medio |
| 4 | Timeline publica | Usa documentos | Nao | Sim | Medio |
| 5 | Propostas por fase | Usa edital/propostas | Sim | Sim | Medio |
| 6 | Transparencia integrada | Usa documentos/contratos | Sim | Sim | Medio/alto |
| 7 | Relatorios | Usa logs | Sim | Nao | Baixo |

## Bloco 1 - Base de governanca

### Objetivo

Criar estrutura minima para que o edital tenha fase, documentos e logs.

### Inclui

- `fase_atual` em `editais`;
- datas de publicacao, recebimento e encerramento;
- `edital_id` em `propostas`;
- tabela `documentos_publicos`;
- tabela `editais_logs`.

### Nao inclui

- tela nova;
- bloqueio de proposta;
- timeline publica;
- alteracao visual.

### Validacao

- edital antigo continua abrindo;
- edital novo continua salvando;
- proposta publica continua enviando;
- transparencia continua abrindo.

## Bloco 2 - Tela interna do edital

### Objetivo

Criar a tela de governanca dentro do admin.

### Inclui

- rota `/admin/editais/[id]/governanca`;
- fase atual;
- avancar fase manualmente;
- observacao obrigatoria;
- logs;
- documentos por edital.

### Nao inclui

- bloqueios fortes;
- mudanca na pagina publica;
- substituicao da transparencia.

### Validacao

- admin exige login;
- tela abre edital existente;
- fase muda apenas com confirmacao;
- log e criado;
- documento e publicado.

## Bloco 3 - Documentos oficiais

### Objetivo

Padronizar documentos do edital por tipo e fase.

### Inclui

- cadastro de documento oficial;
- upload PDF;
- documento publicado/rascunho;
- link de download;
- log de publicacao.

### Nao inclui

- decisao automatica;
- julgamento automatico;
- migracao obrigatoria dos documentos antigos.

### Validacao

- PDF abre;
- documento rascunho nao aparece no publico;
- documento publicado aparece;
- download funciona em producao.

## Bloco 4 - Timeline publica

### Objetivo

Mostrar no site publico o andamento do edital.

### Inclui

- fase atual;
- lista de fases;
- documentos publicados por fase;
- status do recebimento;
- botao de proposta condicional.

### Nao inclui

- alterar decisao humana;
- esconder dados antigos;
- mudar estrutura principal do site.

### Validacao

- `/editais/[id]` abre edital antigo;
- edital sem documentos nao quebra;
- edital com documentos mostra timeline;
- mobile e desktop legiveis.

## Bloco 5 - Propostas por fase

### Objetivo

Amarrar proposta ao edital e impedir envio fora do periodo correto.

### Inclui

- proposta vinculada a `edital_id`;
- envio permitido apenas em fase correta;
- mensagem clara fora do prazo;
- status manual de analise.

### Nao inclui

- aprovacao automatica;
- pontuacao automatica;
- ranking automatico.

### Validacao

- envio dentro do prazo funciona;
- envio fora do prazo bloqueia com mensagem;
- anexos continuam baixando;
- admin lista propostas do edital.

## Bloco 6 - Transparencia integrada

### Objetivo

Fazer transparencia refletir o processo oficial, sem perder compatibilidade.

### Inclui

- documentos oficiais publicados na transparencia;
- contrato/termo ligado ao edital;
- prestacao de contas ligada ao contrato/termo;
- agrupamento mais claro por edital.

### Nao inclui

- apagar tabelas atuais;
- remover documentos ja publicados;
- migracao massiva sem auditoria.

### Validacao

- `/transparencia` continua funcionando;
- documentos antigos continuam visiveis;
- documentos novos aparecem no bloco correto;
- links e downloads funcionam.

## Bloco 7 - Relatorios operacionais

### Objetivo

Apoiar gestao interna.

### Inclui

- editais por fase;
- propostas por edital;
- documentos pendentes;
- contratos em execucao;
- prestacoes pendentes;
- logs recentes.

### Nao inclui

- regra decisoria;
- alteracao no publico.

### Validacao

- dashboard abre;
- numeros batem com registros;
- nao expor dados sensiveis publicamente.

## Dependencias

### Bloco 2 depende de:

- Bloco 1 aplicado no banco.

### Bloco 4 depende de:

- Bloco 1;
- documentos publicados no Bloco 3.

### Bloco 5 depende de:

- `fase_atual`;
- `edital_id` em propostas.

### Bloco 6 depende de:

- documentos oficiais;
- decisao sobre como manter as tabelas atuais de transparencia.

## Ordem recomendada

1. Aprovar documentos tecnicos.
2. Aplicar SQL da Fase 1 em ambiente controlado.
3. Criar tela admin de governanca.
4. Testar com um edital de homologacao.
5. Criar timeline publica.
6. Ativar bloqueio de propostas fora do prazo.
7. Integrar transparencia.
8. Criar relatorios.

## Primeiro pacote implementavel

Pacote mais seguro:

- aplicar base de banco;
- criar tela interna `/admin/editais/[id]/governanca`;
- permitir mudanca manual de fase;
- registrar log;
- publicar documentos oficiais.

Esse pacote ainda nao precisa mudar a pagina publica.

## Criterio de parada

Parar a implantacao se ocorrer:

- erro ao salvar edital;
- erro ao enviar proposta;
- erro ao baixar documento;
- admin pedir login incorretamente;
- transparencia deixar de abrir;
- build ou typecheck falhar.

## Recomendacao final

Nao implementar tudo em um unico commit.

O ideal e aprovar a matriz e seguir pelo primeiro pacote implementavel, validando em producao/staging antes de expor a timeline publica.
