# QA final de producao

## Objetivo

Roteiro final para validar o site IPECC em producao antes de declarar o projeto estavel.

Dominio principal:

```text
https://www.ipecc.org.br
```

## Regra da validacao

Nao criar feature nova durante QA.

Se encontrar problema:

1. registrar pagina;
2. registrar acao feita;
3. registrar erro visual ou funcional;
4. classificar como bloqueante ou ajuste menor;
5. corrigir em commit isolado.

## 1. Validacao publica

### Portal / landing

URL:

```text
https://www.ipecc.org.br/
```

Validar:

- carrega sem erro;
- hero correto;
- botoes principais funcionam;
- menu funciona;
- mobile sem quebra visual;
- SEO basico aparece no navegador.

### Inicio

URL:

```text
https://www.ipecc.org.br/inicio
```

Validar:

- hero correto;
- destaques alinhados;
- noticias e eventos empilham no mobile;
- cards possuem espacamento consistente;
- links abrem corretamente.

### Quem somos

URL:

```text
https://www.ipecc.org.br/quem-somos
```

Validar:

- textos do CMS renderizam;
- bloco principal aparece;
- mobile sem excesso de espaco;
- imagens carregam.

### Projetos

URL:

```text
https://www.ipecc.org.br/projetos
```

Validar:

- cards de projetos;
- links internos;
- hero;
- responsividade.

### Eventos

URL:

```text
https://www.ipecc.org.br/eventos
```

Validar:

- listagem;
- imagens;
- WhatsApp/link, se houver;
- evento sem imagem nao quebra layout.

### Noticias

URL:

```text
https://www.ipecc.org.br/noticias
```

Validar:

- lista;
- detalhe de noticia;
- imagem;
- texto;
- voltar/listar.

### Editais

URL:

```text
https://www.ipecc.org.br/editais
```

Validar:

- edital publico aparece;
- PDF abre;
- download usa bucket correto `editais`;
- governanca em rascunho nao aparece aqui;
- pagina de detalhe do edital abre.

### Transparencia

URL:

```text
https://www.ipecc.org.br/transparencia
```

Validar:

- documentos institucionais;
- convenios;
- editais e chamamentos publicados;
- rascunhos ocultos;
- documentos de governanca abrem;
- prestacao de contas aparece quando houver documento.

### Contato

URL:

```text
https://www.ipecc.org.br/contato
```

Validar:

- canais;
- telefone;
- email;
- checklist fornecedor;
- PDF abre em nova aba;
- formulario/canais sem erro.

### Propostas

URL:

```text
https://www.ipecc.org.br/propostas
```

Validar:

- edital aberto aparece no seletor;
- formulario aceita preenchimento;
- anexos PDF aceitos;
- envio cria proposta;
- mensagem de sucesso aparece;
- anexos nao ficam publicos fora do admin.

## 2. Validacao admin

### Login

URL:

```text
https://www.ipecc.org.br/login
```

Validar:

- login com admin real;
- acesso negado sem sessao;
- fechar aba e voltar exige novo login conforme politica adotada;
- logout encerra sessao.

### Dashboard

URL:

```text
https://www.ipecc.org.br/admin
```

Validar:

- cards carregam;
- layout desktop correto;
- menu lateral proporcional;
- mobile abre menu;
- links rapidos funcionam.

### Admin Editais

URL:

```text
https://www.ipecc.org.br/admin/editais
```

Validar:

- lista editais;
- mostra fase de governanca;
- botao editar funciona;
- botao governanca/fases funciona;
- excluir pede confirmacao.

### Governanca de edital

URL base:

```text
https://www.ipecc.org.br/admin/editais/[id]/governanca
```

Validar:

- fase atual;
- visibilidade publica;
- proximo passo;
- avancar fase com observacao;
- confirmacao humana obrigatoria;
- publicar documento oficial;
- excluir documento de teste;
- logs registram alteracoes;
- propostas vinculadas aparecem.

### Admin Propostas

URL:

```text
https://www.ipecc.org.br/admin/propostas
```

Validar:

- lista propostas;
- mostra edital vinculado;
- abre detalhe;
- baixa anexos;
- aprovar/rejeitar funciona;
- excluir proposta de teste, se aplicavel.

### Admin CMS paginas

Validar:

- `/admin/paginas`;
- `/admin/paginas/quem-somos`;
- `/admin/paginas/editais`;
- `/admin/paginas/transparencia`;
- `/admin/paginas/contato`;
- salvar pequenos ajustes de teste apenas se necessario.

## 3. Responsividade

Testar:

- desktop grande;
- notebook;
- tablet;
- celular Android;
- celular iPhone.

Validar:

- menu publico;
- menu admin;
- heroes;
- cards;
- formularios;
- botoes;
- tabelas/listas;
- nenhum texto cortado;
- nenhum card colado demais;
- nenhum overflow horizontal.

## 4. SEO e indexacao

Validar:

- `https://www.ipecc.org.br/robots.txt`;
- `https://www.ipecc.org.br/sitemap.xml`;
- Search Console com sitemap processado;
- URL principal indexada;
- `/portal` indexavel;
- canonical sempre no dominio `www.ipecc.org.br`.

## 5. Criterio de encerramento

O projeto pode ser considerado estavel quando:

- todas as paginas publicas carregam;
- admin exige login;
- editais e downloads funcionam;
- propostas e anexos funcionam;
- governanca aparece somente em Transparencia quando publica;
- rascunho fica interno;
- sitemap processado;
- build/typecheck OK;
- nao ha erro bloqueante no console ou terminal.

## Resultado final

Classificacao sugerida:

- A: pronto para producao estavel;
- B: producao operacional com ajustes menores;
- C: bloqueado por erro critico.

