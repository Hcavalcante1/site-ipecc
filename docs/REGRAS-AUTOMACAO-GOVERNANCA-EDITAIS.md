# Regras de automacao segura: governanca de editais

## Objetivo

Definir o que o sistema pode automatizar no fluxo de editais sem substituir a decisao humana.

## Regra principal

O sistema pode automatizar:

- organizacao;
- checklist;
- prazos;
- bloqueios operacionais;
- logs;
- publicacao padronizada;
- alertas.

O sistema nao pode automatizar:

- analise tecnica;
- julgamento;
- aprovacao;
- rejeicao;
- homologacao;
- adjudicacao;
- validacao de prestacao de contas.

## Tipos de regra

### Bloqueio

Impede a acao quando existe risco claro de erro operacional.

### Alerta

Permite continuar, mas avisa que ha pendencia.

### Registro

Nao bloqueia, mas grava log institucional.

## Bloqueios recomendados

### 1. Publicar edital sem PDF principal

Acao bloqueada:

```text
Publicar edital
```

Mensagem:

```text
Anexe o PDF oficial do edital antes de publicar.
```

Motivo:

Edital publico sem documento oficial gera risco institucional.

### 2. Abrir recebimento sem periodo definido

Acao bloqueada:

```text
Avancar para recebimento de propostas
```

Mensagem:

```text
Informe a data inicial e final de recebimento de propostas.
```

Motivo:

O envio de propostas precisa ter prazo claro.

### 3. Enviar proposta fora do periodo

Acao bloqueada:

```text
Enviar proposta
```

Mensagem:

```text
O periodo de envio de propostas nao esta aberto para este edital.
```

Motivo:

Evita recebimento fora do prazo oficial.

### 4. Publicar resultado preliminar sem documento

Acao bloqueada:

```text
Avancar para resultado preliminar
```

Mensagem:

```text
Publique o documento de resultado preliminar antes de avancar esta fase.
```

Motivo:

Resultado precisa de documento formal.

### 5. Abrir recurso sem prazo

Acao bloqueada:

```text
Avancar para fase de recurso
```

Mensagem:

```text
Informe o prazo inicial e final para recebimento de recursos.
```

Motivo:

Recursos precisam de janela oficial definida.

### 6. Publicar resultado final antes do fim do recurso

Acao bloqueada:

```text
Avancar para resultado final
```

Mensagem:

```text
O prazo de recurso ainda nao foi encerrado.
```

Motivo:

Evita conflito com direito de recurso.

### 7. Marcar como homologado sem documento

Acao bloqueada:

```text
Avancar para homologado
```

Mensagem:

```text
Publique o documento de homologacao antes de concluir esta fase.
```

Motivo:

Homologacao exige ato formal.

### 8. Marcar como contratado sem contrato ou termo

Acao bloqueada:

```text
Avancar para contratado
```

Mensagem:

```text
Publique o contrato ou termo de parceria antes de avancar.
```

Motivo:

Contratacao precisa de instrumento formal publicado.

### 9. Encerrar sem documento de encerramento

Acao bloqueada:

```text
Encerrar edital
```

Mensagem:

```text
Publique o documento de encerramento ou prestacao de contas final.
```

Motivo:

Encerramento precisa de registro institucional.

## Alertas recomendados

### 1. Edital sem anexos complementares

Mensagem:

```text
Este edital nao possui anexos complementares cadastrados.
```

Tipo:

Alerta, nao bloqueio.

### 2. Proposta com anexos incompletos

Mensagem:

```text
Esta proposta pode estar com documentos pendentes. Revise manualmente antes de decidir.
```

Tipo:

Alerta, nao bloqueio.

### 3. Resultado preliminar sem observacao

Mensagem:

```text
Considere registrar observacao interna sobre o resultado preliminar.
```

Tipo:

Alerta, nao bloqueio.

### 4. Contrato perto do vencimento

Mensagem:

```text
Este contrato esta proximo do fim da vigencia.
```

Tipo:

Alerta.

### 5. Prestacao de contas pendente

Mensagem:

```text
Ha prestacao de contas pendente para este instrumento.
```

Tipo:

Alerta.

## Registros obrigatorios

Sempre registrar log quando ocorrer:

- criacao de edital;
- publicacao de edital;
- mudanca de fase;
- publicacao de documento;
- alteracao de status de proposta;
- abertura de prazo de recurso;
- publicacao de julgamento;
- homologacao;
- publicacao de contrato;
- publicacao de prestacao de contas;
- encerramento.

## Formato minimo do log

Campos:

- edital;
- usuario;
- acao;
- fase anterior;
- fase nova;
- documento relacionado;
- observacao;
- data.

## Confirmacoes obrigatorias

Algumas acoes devem exigir confirmacao explicita:

### Mudar fase

Texto:

```text
Confirmo que esta mudanca de fase representa uma decisao humana e institucional.
```

### Publicar resultado

Texto:

```text
Confirmo que o documento publicado representa o resultado validado pela equipe responsavel.
```

### Homologar

Texto:

```text
Confirmo que a homologacao foi validada pela autoridade responsavel.
```

### Encerrar

Texto:

```text
Confirmo que o processo possui documentos suficientes para encerramento institucional.
```

## Regras por fase

### `rascunho`

Pode:

- editar dados;
- anexar PDF;
- salvar sem publicar.

Nao deve:

- receber propostas.

### `publicado`

Pode:

- aparecer no site;
- exibir PDF;
- preparar recebimento.

Nao deve:

- receber proposta se o periodo ainda nao estiver aberto.

### `recebimento_propostas`

Pode:

- receber propostas;
- receber anexos.

Nao deve:

- permitir envio apos prazo final.

### `analise`

Pode:

- listar propostas;
- permitir decisao manual;
- registrar pareceres.

Nao deve:

- receber novas propostas.

### `resultado_preliminar`

Pode:

- publicar documento preliminar;
- preparar prazo de recurso.

Nao deve:

- publicar resultado final antes dos recursos.

### `recurso`

Pode:

- receber/registrar recursos;
- anexar documentos de recurso.

Nao deve:

- encerrar recurso antes do prazo sem justificativa registrada.

### `julgamento_recurso`

Pode:

- publicar ata, parecer ou julgamento.

Nao deve:

- alterar resultado sem documento.

### `resultado_final`

Pode:

- publicar resultado final.

Nao deve:

- homologar sem documento de homologacao.

### `homologado`

Pode:

- preparar contrato ou termo.

Nao deve:

- marcar contratado sem instrumento publicado.

### `adjudicado`

Pode:

- registrar adjudicacao quando aplicavel.

Nao deve:

- ser obrigatorio para todos os editais.

### `contratado`

Pode:

- publicar contrato/termo;
- iniciar execucao.

Nao deve:

- encerrar sem prestacao quando aplicavel.

### `execucao`

Pode:

- publicar documentos de acompanhamento.

Nao deve:

- substituir prestacao de contas.

### `prestacao_contas`

Pode:

- publicar documentos de prestacao;
- registrar pareceres.

Nao deve:

- aprovar automaticamente.

### `encerrado`

Pode:

- exibir historico completo.

Nao deve:

- permitir envio de proposta ou nova fase sem reabertura formal.

## Recomendacao final

Implementar primeiro registros e alertas. Depois aplicar bloqueios.

Essa ordem reduz risco:

1. registrar tudo;
2. mostrar pendencias;
3. validar com equipe;
4. transformar pendencias criticas em bloqueios.
