# Handoff: governanca de editais e chamamentos

## Situacao atual

Foi preparado um pacote tecnico completo para evoluir o modulo de Editais e Chamamentos sem alterar producao neste momento.

Nada foi aplicado no banco.
Nada foi alterado no fluxo atual do site.
Nada foi commitado.
Nada foi enviado para o GitHub.

## Arquivos criados

### 1. Projeto tecnico

Arquivo:

```text
docs/PROJETO-GOVERNANCA-EDITAIS.md
```

Conteudo:

- diagnostico do fluxo atual;
- arquitetura proposta;
- modelo de banco;
- telas necessarias;
- riscos;
- plano de migracao.

### 2. Plano de implantacao

Arquivo:

```text
docs/PLANO-IMPLANTACAO-GOVERNANCA-EDITAIS.md
```

Conteudo:

- etapas de implantacao;
- ordem segura;
- validacoes por etapa;
- criterios de go/no-go.

### 3. Especificacao da tela admin

Arquivo:

```text
docs/ESPEC-TELA-GOVERNANCA-EDITAL.md
```

Conteudo:

- desenho da futura tela `/admin/editais/[id]/governanca`;
- fase atual;
- checklist;
- documentos;
- propostas vinculadas;
- historico institucional.

### 4. Especificacao da timeline publica

Arquivo:

```text
docs/ESPEC-TIMELINE-PUBLICA-EDITAIS.md
```

Conteudo:

- como o edital deve aparecer publicamente;
- fases visiveis;
- documentos por fase;
- regra do botao de proposta;
- integracao com transparencia.

### 5. Regras de automacao segura

Arquivo:

```text
docs/REGRAS-AUTOMACAO-GOVERNANCA-EDITAIS.md
```

Conteudo:

- o que pode ser bloqueado;
- o que deve ser apenas alerta;
- o que sempre exige decisao humana;
- logs obrigatorios;
- confirmacoes institucionais.

### 6. Matriz de implantacao

Arquivo:

```text
docs/MATRIZ-GOVERNANCA-EDITAIS.md
```

Conteudo:

- blocos de implementacao;
- dependencias;
- riscos;
- ordem recomendada.

### 7. Checklist de QA

Arquivo:

```text
docs/CHECKLIST-QA-GOVERNANCA-EDITAIS.md
```

Conteudo:

- testes obrigatorios por etapa;
- validacao admin;
- validacao publica;
- validacao de propostas;
- validacao de transparencia;
- build e typecheck.

### 8. SQL proposto

Arquivo:

```text
docs/sql/governanca-editais-fase-1-PROPOSTA.sql
```

Conteudo:

- `fase_atual` em editais;
- vinculo `edital_id` em propostas;
- tabela `documentos_publicos`;
- tabela `editais_logs`;
- RLS inicial.

Observacao:

O SQL termina com `rollback` por seguranca. Ele nao deve ser aplicado sem revisao.

## Decisao tecnica adotada

Automatizar o processo, nao a decisao.

O sistema podera:

- controlar fases;
- organizar documentos;
- validar prazos;
- alertar pendencias;
- bloquear erros operacionais;
- registrar logs;
- publicar timeline.

O sistema nao deve:

- julgar proposta;
- aprovar automaticamente;
- reprovar automaticamente;
- homologar automaticamente;
- decidir recurso;
- validar prestacao de contas sem humano.

## Primeiro pacote recomendado para implementar

O primeiro pacote real deve ser pequeno:

1. Aplicar base minima no banco, depois de aprovacao.
2. Criar tela interna de governanca do edital.
3. Permitir mudanca manual de fase.
4. Registrar logs.
5. Permitir documentos oficiais por fase.

Nao incluir ainda:

- timeline publica;
- bloqueio de propostas;
- integracao total com transparencia.

## Ordem segura futura

### Commit 1

Documentacao tecnica:

```text
docs(PROJETO/PLANO/ESPEC/MATRIZ/CHECKLIST)
docs/sql/governanca-editais-fase-1-PROPOSTA.sql
```

### Commit 2

Base de banco aprovada:

```text
SQL aplicado manualmente no Supabase
```

Sem commit de codigo, se for apenas execucao no banco.

### Commit 3

Admin interno:

```text
feat(admin): criar governanca manual de editais
```

### Commit 4

Timeline publica:

```text
feat(public): exibir timeline dos editais
```

### Commit 5

Propostas por fase:

```text
feat(propostas): controlar envio por fase do edital
```

### Commit 6

Transparencia integrada:

```text
feat(transparencia): integrar documentos oficiais de editais
```

## Pendencias antes da implementacao

Confirmar:

- se `adjudicacao` aparece no publico ou apenas internamente;
- quais editais usam contrato e quais usam termo de parceria;
- se todos os editais terao prazo de recurso;
- se propostas antigas precisam ser vinculadas retroativamente a editais;
- se os documentos atuais de transparencia serao migrados ou mantidos em paralelo.

## Recomendacao final

O projeto esta pronto para aprovacao tecnica.

Proximo passo seguro:

1. revisar estes documentos;
2. aprovar ou ajustar a Fase 1;
3. depois preparar commit isolado apenas da documentacao;
4. somente depois decidir se o SQL sera aplicado.
