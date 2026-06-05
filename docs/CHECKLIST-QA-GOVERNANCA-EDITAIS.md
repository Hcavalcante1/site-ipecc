# Checklist de QA: governanca de editais

## Objetivo

Definir os testes obrigatorios antes de liberar cada etapa da governanca de editais.

## Regra geral

Nenhuma etapa deve avancar se quebrar:

- login/admin;
- cadastro de edital;
- edicao de edital;
- envio de proposta;
- download de documentos;
- pagina publica `/editais`;
- pagina publica `/transparencia`;
- build;
- typecheck.

## QA antes de aplicar SQL

Confirmar:

- backup ou ponto de reversao disponivel;
- SQL revisado;
- SQL termina com `commit` somente na versao aprovada;
- ambiente correto selecionado;
- `.env.local` nao sera alterado;
- tabelas atuais foram conferidas.

Nao aplicar se houver duvida sobre:

- nome de tabela;
- coluna ja existente;
- policy RLS;
- permissao de leitura publica;
- impacto em propostas.

## QA da base de dados

Depois de aplicar a Fase 1, testar:

- edital antigo abre no admin;
- edital antigo abre no publico;
- edital novo salva;
- edital novo aparece em `/editais`;
- proposta publica envia;
- anexo de proposta envia;
- documento de edital baixa;
- transparencia abre;
- build passa;
- typecheck passa.

## QA da tela admin de governanca

Testar:

- admin exige login;
- acessar `/admin/editais/[id]/governanca`;
- tela carrega titulo do edital;
- tela mostra fase atual;
- avancar fase exige confirmacao;
- avancar fase exige observacao;
- fase muda corretamente;
- log e criado;
- erro aparece com mensagem clara;
- sair do admin exige novo login conforme regra atual.

## QA de documentos oficiais

Testar:

- upload de PDF valido;
- bloqueio de arquivo nao permitido;
- bloqueio de arquivo grande;
- titulo obrigatorio;
- tipo obrigatorio;
- fase opcional ou obrigatoria conforme regra;
- documento publicado aparece no admin;
- documento rascunho nao aparece no publico;
- download abre;
- link abre em nova aba quando aplicavel;
- log de publicacao e criado.

## QA da timeline publica

Testar em `/editais/[id]`:

- edital sem documentos nao quebra;
- edital com documentos mostra timeline;
- fase atual aparece correta;
- fases futuras aparecem como pendentes;
- fase nao aplicavel nao confunde usuario;
- botao de proposta aparece apenas no periodo correto;
- botao de proposta some ou bloqueia fora do periodo;
- PDF principal baixa;
- documentos por fase baixam;
- mobile legivel;
- desktop alinhado.

## QA de propostas por fase

Testar:

- envio permitido durante `recebimento_propostas`;
- envio bloqueado fora da fase;
- envio bloqueado apos prazo final;
- mensagem clara quando bloqueado;
- proposta salva com `edital_id`;
- admin filtra propostas por edital;
- anexos continuam disponiveis;
- status continua manual.

## QA da transparencia integrada

Testar:

- `/transparencia` abre;
- documentos antigos continuam aparecendo;
- documentos novos aparecem no bloco correto;
- contrato/termo aparece quando publicado;
- prestacao de contas aparece vinculada;
- downloads abrem;
- mobile legivel;
- SEO/canonical nao muda indevidamente.

## QA de logs e auditoria

Conferir se registra:

- criacao de edital;
- publicacao de edital;
- mudanca de fase;
- documento publicado;
- status de proposta alterado;
- homologacao;
- contrato publicado;
- prestacao publicada;
- encerramento.

Cada log deve ter:

- edital;
- usuario;
- acao;
- data;
- fase anterior;
- fase nova;
- observacao quando exigida.

## QA visual

Testar em desktop e mobile:

- admin editais;
- admin propostas;
- admin transparencia;
- nova tela de governanca;
- `/editais`;
- `/editais/[id]`;
- `/propostas`;
- `/transparencia`.

Verificar:

- sem overflow horizontal;
- botoes proporcionais;
- textos legiveis;
- cards alinhados;
- menus acessiveis;
- mensagens claras.

## QA tecnico

Rodar:

```powershell
npx tsc --noEmit
npm run build
```

Resultado exigido:

- typecheck sem erro;
- build sem erro.

## Go-live por etapa

### Pode avancar

Quando:

- funcionalidades antigas continuam funcionando;
- nova etapa funciona em edital de teste;
- downloads funcionam;
- admin exige login;
- build e typecheck passam.

### Nao pode avancar

Se:

- edital nao salva;
- proposta nao envia;
- documento nao baixa;
- admin fica publico;
- transparencia quebra;
- erro no build;
- erro no typecheck.

## Recomendacao final

Usar este checklist a cada bloco implementado.

O processo deve evoluir por aprovacao gradual, nao por mudanca grande em lote.
