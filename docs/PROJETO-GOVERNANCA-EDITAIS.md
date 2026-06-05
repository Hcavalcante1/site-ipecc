# Projeto tecnico: governanca de editais e chamamentos

## Objetivo

Evoluir o modulo de Editais e Chamamentos para um ciclo completo de governanca institucional, sem automatizar decisoes humanas.

O sistema deve organizar fases, documentos, prazos, logs e publicacao. A analise tecnica, julgamento de recursos, homologacao e decisao final continuam sob responsabilidade da equipe.

## Diagnostico do fluxo atual

Hoje o fluxo esta funcional, mas dividido em blocos:

- `editais`: registra o edital publico, status basico, periodo e PDF principal.
- `/editais`: lista os editais e permite baixar o PDF.
- `/editais/[id]`: exibe detalhe do edital e direciona para envio de proposta.
- `/propostas`: recebe propostas e anexos enviados pelo publico.
- `/admin/propostas`: permite analise manual e alteracao simples de status.
- `transparencia_editais`: registra resultado preliminar, recursos, resultado final, homologacao e contrato.
- `transparencia_convenios`: registra instrumentos, convenios, contratos ou termos.
- `transparencia_prestacao_contas`: registra documentos de execucao e prestacao de contas.
- `/transparencia`: publica documentos e fases de transparencia.

O problema principal nao e ausencia de telas, mas falta de um processo central amarrado pelo edital.

## Principio de desenho

O edital deve ser o processo principal.

Tudo deve ficar ligado ao edital:

- publicacao;
- propostas recebidas;
- analise humana;
- resultado preliminar;
- recursos;
- julgamento;
- resultado final;
- homologacao;
- adjudicacao, quando aplicavel;
- contrato ou termo de parceria;
- execucao;
- prestacao de contas;
- encerramento.

## O que automatizar

### 1. Controle de fase

O sistema pode controlar a fase atual do edital, mas a mudanca deve ser confirmada por usuario autorizado.

Fases sugeridas:

```text
rascunho
publicado
recebimento_propostas
analise
resultado_preliminar
recurso
julgamento_recurso
resultado_final
homologado
adjudicado
contratado
execucao
prestacao_contas
encerrado
```

### 2. Checklist por fase

Antes de avancar uma fase, o sistema pode mostrar pendencias.

Exemplos:

- publicar edital sem PDF principal;
- encerrar recebimento antes do prazo;
- publicar resultado preliminar sem documento;
- abrir recurso sem prazo inicial e final;
- publicar resultado final antes do periodo de recurso;
- marcar como contratado sem contrato ou termo;
- encerrar sem prestacao de contas, quando aplicavel.

O sistema nao decide o merito. Ele apenas alerta ou bloqueia erro operacional.

### 3. Linha do tempo publica

A pagina publica do edital deve exibir uma timeline com:

- Publicacao;
- Recebimento de propostas;
- Analise tecnica;
- Resultado preliminar;
- Recursos;
- Julgamento dos recursos;
- Resultado final;
- Homologacao;
- Contrato;
- Execucao;
- Prestacao de contas;
- Encerramento.

### 4. Organizacao documental

Documentos devem ser vinculados ao edital e a uma fase.

Tipos sugeridos:

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

### 5. Logs institucionais

Toda acao relevante deve gerar registro:

- quem fez;
- quando fez;
- qual edital;
- fase anterior;
- nova fase;
- documento publicado;
- observacao.

## O que nao automatizar

Nao automatizar:

- analise tecnica;
- pontuacao;
- deferimento ou indeferimento;
- julgamento de recurso;
- escolha de vencedor;
- homologacao;
- adjudicacao;
- validacao de prestacao de contas.

Essas decisoes exigem fator humano, criterios especificos por edital e responsabilidade institucional.

## Modelo de banco proposto

### 1. Evoluir tabela `editais`

Adicionar campos de controle:

```sql
alter table public.editais
  add column if not exists fase_atual text default 'rascunho',
  add column if not exists publicado_em timestamptz,
  add column if not exists recebimento_inicio timestamptz,
  add column if not exists recebimento_fim timestamptz,
  add column if not exists encerrado_em timestamptz;
```

### 2. Relacionar propostas ao edital

Se a tabela `propostas` ainda nao tiver vinculo formal com edital:

```sql
alter table public.propostas
  add column if not exists edital_id uuid references public.editais(id);
```

### 3. Criar tabela de documentos publicos

```sql
create table if not exists public.documentos_publicos (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid references public.editais(id) on delete cascade,
  tipo text not null,
  fase text,
  titulo text not null,
  descricao text,
  arquivo_url text not null,
  publicado boolean default true,
  publicado_em timestamptz default now(),
  created_at timestamptz default now()
);
```

### 4. Criar tabela de logs do edital

```sql
create table if not exists public.editais_logs (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid references public.editais(id) on delete cascade,
  usuario_email text,
  acao text not null,
  fase_anterior text,
  fase_nova text,
  documento_id uuid references public.documentos_publicos(id),
  observacao text,
  created_at timestamptz default now()
);
```

### 5. Tabelas futuras, se o processo exigir mais detalhe

Podem ser criadas depois, sem necessidade de implantar tudo de uma vez:

- `editais_resultados_preliminares`;
- `editais_recursos`;
- `editais_julgamentos`;
- `editais_resultados_finais`;
- `editais_homologacoes`;
- `editais_adjudicacoes`;
- `contratos`;
- `editais_execucao`;
- `editais_prestacao_contas`.

Recomendacao: comecar com `documentos_publicos` e `editais_logs`, porque isso reduz risco e evita criar tabelas demais antes de validar o fluxo.

## Telas admin necessarias

### 1. Edital - visao geral de governanca

Nova area dentro do edital:

```text
/admin/editais/[id]/governanca
```

Conteudo:

- fase atual;
- botoes de avancar fase;
- pendencias/checklist;
- documentos publicados;
- propostas vinculadas;
- historico institucional.

### 2. Documentos do edital

Permitir publicar documento vinculado a:

- tipo;
- fase;
- titulo;
- arquivo PDF;
- status publicado/rascunho.

### 3. Propostas do edital

Filtrar propostas por edital.

A decisao continua manual:

- pendente;
- em analise;
- habilitada;
- inabilitada;
- aprovada;
- rejeitada.

### 4. Recursos

Registrar:

- periodo de recurso;
- documentos recebidos;
- julgamento;
- documento de resposta;
- resultado apos recurso.

### 5. Contrato e execucao

Registrar:

- contrato ou termo;
- contratado;
- CNPJ;
- datas;
- documentos;
- fase de execucao.

### 6. Prestacao de contas

Registrar:

- convenio/contrato relacionado;
- fase da prestacao;
- documento;
- status;
- parecer ou termo de encerramento.

## Paginas publicas impactadas

### `/editais`

Mostrar:

- fase atual;
- prazo de recebimento;
- status claro;
- botao de proposta apenas quando a fase permitir.

### `/editais/[id]`

Mostrar timeline do edital:

- fase atual;
- documentos por fase;
- periodo de recurso;
- resultado preliminar/final;
- homologacao;
- contrato;
- prestacao de contas.

### `/transparencia`

Continuar exibindo documentos institucionais, mas consumindo dados mais conectados ao edital.

## Regras profissionais sugeridas

### Bloqueios automaticos seguros

- Nao receber proposta fora da fase `recebimento_propostas`.
- Nao avancar para resultado preliminar sem documento publicado.
- Nao avancar para resultado final antes do prazo de recurso terminar.
- Nao marcar como contratado sem documento de contrato ou termo.
- Nao encerrar sem documento de encerramento/prestacao, quando aplicavel.

### Alertas sem bloqueio

- edital publicado sem anexos complementares;
- proposta sem todos os documentos esperados;
- recurso sem documento de julgamento;
- contrato com prazo vencido;
- prestacao de contas pendente.

## Plano de migracao seguro

### Etapa 1 - Base de dados

Criar apenas:

- `fase_atual` em `editais`;
- `edital_id` em `propostas`;
- `documentos_publicos`;
- `editais_logs`.

Sem alterar as paginas publicas ainda.

### Etapa 2 - Admin interno

Criar a tela de governanca do edital.

Ela deve permitir:

- ver fase atual;
- avancar fase manualmente;
- publicar documentos por fase;
- ver propostas vinculadas;
- registrar logs.

### Etapa 3 - Publico

Adicionar timeline em `/editais/[id]`.

Depois ajustar `/editais` para mostrar fase atual.

### Etapa 4 - Transparencia

Conectar transparencia aos documentos oficiais do edital.

Manter as tabelas atuais durante a transicao para evitar quebra.

### Etapa 5 - Regras e seguranca

Aplicar RLS, permissoes, logs obrigatorios e validacoes por fase.

## Riscos

### Risco baixo

- adicionar campos novos opcionais;
- criar tabelas novas;
- criar tela admin sem substituir telas existentes.

### Risco medio

- bloquear envio de proposta por fase;
- migrar documentos de transparencia para modelo central;
- alterar exibicao publica de timeline.

### Risco alto

- substituir de uma vez as tabelas atuais de transparencia;
- automatizar decisao tecnica;
- apagar ou migrar documentos sem auditoria.

## Recomendacao final

Seguir em implantacao gradual.

Primeiro criar a base de governanca sem remover nada do fluxo atual. Depois testar com um edital real ou de homologacao. So entao conectar a timeline publica e os bloqueios de fase.

A melhor decisao profissional e:

- automatizar controle, checklist, prazo, log e publicacao;
- manter julgamento, analise, homologacao e validacao como decisao humana.
