# Fase 4 — Runbook rápido (WhatsApp Meta sandbox)

Objetivo: executar a validação fim a fim da Fase 4 e registrar evidências.

## Pré-requisitos

- `.env.local` preenchido com variáveis `WHATSAPP_*`
- Dependências instaladas (`npm install`)
- Terminal disponível para `npm run dev`

Template local (dry-run, só desenvolvimento):

```bash
npm run preparar:env-whatsapp-meta -- --aplicar
# reinicie npm run dev após aplicar
npm run validar:env-whatsapp-meta
```

Sem credenciais Meta reais ainda:

```bash
npm run fase4:whatsapp-meta:parcial
```

## Execução padrão

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run diagnostico:fase4-whatsapp-meta
npm run validar:status-fase4-whatsapp
npm run fase4:whatsapp-meta:status
```

Atalho único (diagnóstico + execução + atualização de status):

```bash
npm run fase4:whatsapp-meta:full
```

Observação: este comando atualiza o `ENTERPRISE-STATUS.md` mesmo em caso de falha, para preservar evidências de execução.
Ele também executa `npm run validar:status-fase4-whatsapp` no início (fail-fast de estrutura do status).

## Saídas esperadas

- Arquivos em `reports/`:
  - `whatsapp-meta.txt`
  - `whatsapp-webhook.txt`
  - `whatsapp-webhook-http.txt`
- Comando `npm run validar:dod-whatsapp-meta` sem falhas

## Registro operacional

1. Executar `npm run atualizar:status-fase4-whatsapp`
2. Abrir `docs/ENTERPRISE-STATUS.md`
3. Revisar bloco **Evidências Fase 4 — WhatsApp Meta (sandbox)**

## Critério de conclusão

A fase só é concluída quando:

- todos os checks esperados aparecem como `OK:`
- não há `FALHA`/`ERROR` nos reports
- evidências foram registradas no status
