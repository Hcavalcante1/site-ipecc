# Enterprise — operação rápida (cheat sheet)

Guia único para o dia a dia da trilha enterprise local.

## 0) Evolução segura (validar etapa a etapa)

Com `npm run dev` ativo para a variante HTTP:

```bash
npm run evolucao:segura          # ops + código + WhatsApp DoD + guard (~3 min)
npm run evolucao:segura:http     # acima + smoke 18 rotas + CMS (~5–8 min)
```

## 1) Check diário (sem executar Fase 4)

```bash
npm run check:enterprise-operacao
```

Inclui:

- estrutura de scripts/docs (`validar:enterprise-ops`)
- tarefas agendadas no Windows (`verificar:agendamento-enterprise-guard`)
- panorama operacional (`diagnostico:enterprise-operacao`)

## 2) Gate padrão (antes de push)

```bash
npm run validar:push-prep
npm run guard:enterprise -- --no-build
```

## 3) Gate completo (quando necessário)

```bash
npm run guard:enterprise
```

## 4) Etapa 8 — Meta real (após etapas 1–7 OK)

```bash
npm run validar:whatsapp-meta-real-preflight   # falha se ainda for template local
# substituir WHATSAPP_* no .env.local + reiniciar npm run dev
# ngrok http 3000 → registrar webhook na Meta
npm run fase4:whatsapp-meta:full
```

## 5) Fase 4 WhatsApp Meta (execução local / dry-run)

**Pré-requisito:** variáveis `WHATSAPP_*` em `.env.local` (modelo em `.env.example`, guia em `docs/WHATSAPP-META-SANDBOX.md`).

Template local dry-run (reiniciar `dev` depois):

```bash
npm run preparar:env-whatsapp-meta -- --aplicar
```

```bash
npm run validar:env-whatsapp-meta
npm run diagnostico:fase4-whatsapp-meta   # deve terminar com "OK para executar"
```

Sem credenciais Meta ainda (só código + dev):

```bash
npm run fase4:whatsapp-meta:parcial
# ou passo a passo:
npm run coletar:evidencias-whatsapp-meta:parcial
npm run validar:dod-whatsapp-meta:parcial
npm run atualizar:status-fase4-whatsapp
npm run sincronizar:checklist-fase4-status
```

Prontidão geral (ops + Fase 4):

```bash
npm run validar:enterprise-readiness
```

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run fase4:whatsapp-meta:full
```

Atalho equivalente em duas etapas:

```bash
npm run diagnostico:fase4-whatsapp-meta
npm run fase4:whatsapp-meta:status
```

## 5) Agendamento Windows (08:00)

```powershell
.\scripts\agendar-enterprise-guard.ps1
# variante com Fase 4:
.\scripts\agendar-enterprise-guard.ps1 -IncludeFase4
```

Remoção:

```powershell
.\scripts\agendar-enterprise-guard.ps1 -Remover
.\scripts\agendar-enterprise-guard.ps1 -Remover -IncludeFase4
.\scripts\agendar-enterprise-guard.ps1 -RemoverTodos
```

## 6) Onde registrar evidências

- Status operacional: `docs/ENTERPRISE-STATUS.md` (bloco automático Fase 4)
- Roteiro de evolução: `docs/EVOLUCAO-PASSOS.md`
- Logs do guard: `reports/enterprise-guard-*.log`

## Critério de “Fase 4 concluída”

Somente quando:

- `npm run validar:dod-whatsapp-meta` passa
- reports em `reports/whatsapp-*.txt` sem `FALHA`/`ERROR` (e sem `SKIP` sem justificativa)
- handoff validado (`reports/whatsapp-handoff-fase4.txt`)
- evidências registradas no `ENTERPRISE-STATUS.md`
