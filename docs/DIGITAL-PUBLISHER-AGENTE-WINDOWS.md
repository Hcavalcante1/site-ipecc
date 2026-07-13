# Agente residente Windows — Digital IPECC

Publicar pelo admin **sem** abrir script a cada post.  
Custo extra: **R$ 0**. Requisito: o PC com o agente precisa estar **ligado** e online.

## Fluxo

1. Admin aprova / **Publicar agora (fila)** (Vercel grava no Supabase)
2. Agente no Windows consulta a fila sozinho
3. Usa Chrome + sessão Meta já conectada
4. Publica e atualiza status no admin (heartbeat)

## Instalação (uma vez)

Na pasta do projeto, PowerShell:

```powershell
node scripts/aplicar-digital-agents-resident.cjs
powershell -ExecutionPolicy Bypass -File scripts\install-digital-agent-windows.ps1
schtasks /Run /TN IPECC-Digital-Publisher
```

No admin `/admin/digital` → card **Agente de publicação** → deve aparecer **Agente conectado**.

Depois: Perfis → **Conectar (browser)** uma vez (login Meta).

Desinstalar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\uninstall-digital-agent-windows.ps1
```

## O que o Agendador faz

| Configuração | Valor |
|--------------|--------|
| Nome | `IPECC-Digital-Publisher` |
| Gatilho | Logon do Windows |
| Reinício em falha | 3× / 1 min |
| Segunda instância | Ignorada |
| Limite de tempo | Sem limite |

Logs: `services/digital-publisher/data/logs/`

## Status no admin

| Situação | Texto |
|----------|--------|
| Heartbeat fresco | Agente conectado |
| Sem heartbeat (~90s) | Agente offline |
| Conta Meta expired | Sessão Meta expirada |
| Post queued + PC off | Na fila · aguardando computador |
| Em execução | Processando |
| Sucesso / falha | Publicado / Falhou |

Com agente offline, **Publicar agora** ainda funciona: o post **fica na fila** (não finge publicação imediata).

## Limitação

PC desligado → posts esperam na fila.  
Caminho definitivo futuro: **Meta Graph API** (publica na Vercel sem PC).

## Arquivos

- SQL: `docs/sql/digital-agents-resident.sql`
- Worker heartbeat: `services/digital-publisher/src/agentHeartbeat.ts`
- API: `app/api/admin/digital/agent/route.ts`
- Instalador: `scripts/install-digital-agent-windows.ps1`
