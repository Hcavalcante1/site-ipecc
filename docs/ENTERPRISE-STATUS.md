# Status enterprise — staging local

Atualizado: 2026-05-27 · enterprise ops + Fase 4 DoD local OK · validações manuais (Meta/ngrok/admin/visual) adiadas · HEAD `7735cc0`.

## Gates automatizados

```bash
npm run validar:push-prep       # rápido (código + WhatsApp scripts)
npm run guard:enterprise        # local (relatório em reports/)
npm run validar:enterprise      # completo (+ build)
npm run auditar:cms-staging     # conteúdo teste no Supabase
npm run validar:public-pages-padrao
npm run validar:publico
npm run validar:smoke-publico   # requer npm run dev
npm run validar:status-fase4-whatsapp
npm run validar:enterprise:fase4 # gate enterprise com execução da Fase 4
npm run guard:enterprise -- --include-fase4
```

Agendamento Windows (08:00): `scripts/agendar-enterprise-guard.ps1` → tarefa `IPECC-Enterprise-Guard-Local` (ou `IPECC-Enterprise-Guard-Local-Fase4` com `-IncludeFase4`).

## Público / operação (BATCH 8–18)

| Item | Status |
|------|--------|
| `validar:publico` | OK |
| `validar:admin` | OK |
| Mobile 375px (BATCH 16) | OK (código) |
| Smoke HTTP (BATCH 14+) | OK com dev (`/`, `/inicio`, redirects legados) |
| CMS limpeza (BATCH 17) | OK (`auditar:cms-staging` 0 suspeitos, 2026-05-26) |
| Landing `/` + editorial `/inicio` | OK (`validar:public-pages-padrao`, redirects `/portal`→`/inicio`, `/apresentacao`→`/`) |
| Pacote push | `docs/PUSH-PACKAGE-LOCAL.md` · push `ipecc-whatsapp-leads` + espelho `site-ipecc` |
| WhatsApp Fases 1–3 | Código OK; **Fase 4 DoD completo** (local dry-run, `validar:dod-whatsapp-meta` OK) |

## Evidências Fase 4 — WhatsApp Meta (sandbox)

Preencher este bloco durante a execução da fase:

Comando único (com `npm run dev` ativo em outro terminal):

```powershell
npm run coletar:evidencias-whatsapp-meta
npm run resumo:whatsapp-meta-evidencias
```

Atalho de execução ponta a ponta (Terminal 2):

```powershell
npm run fase4:whatsapp-meta
```

- [x] `npm run validar:whatsapp-meta`
  - Resultado esperado: linhas `OK:` do handshake GET e cenários de erro.
  - Evidência (cole a saída):
    - `OK: subscribe válido retorna challenge`
    - `OK: token errado → forbidden`
    - `OK: sem WHATSAPP_VERIFY_TOKEN → missing_config`
- [x] `npm run validar:whatsapp-webhook`
  - Resultado esperado: `OK:` para assinatura, JSON inválido, fixture e idempotência.
  - Evidência (cole a saída):
    - `OK: 503 sem WHATSAPP_APP_SECRET`
    - `OK: 401 assinatura inválida`
    - `OK: 400 JSON inválido`
    - `OK: 200 fixture processado`
    - `OK: idempotência no mesmo messageId`
- [x] `npm run validar:whatsapp-webhook-http` (com `npm run dev`)
  - Resultado esperado: handshake GET `200` + POST assinado `200` com `processed=1`.
  - Evidência (cole a saída):
    - `OK: GET handshake Meta (HTTP 200 + challenge)`
    - `OK: POST fixture assinado (HTTP 200)`
    - `OK: corpo JSON com processed=1`
- [x] `npm run validar:whatsapp-handoff-fase4`
  - Resultado esperado: handoff acionado, label correto e idempotência.
  - Evidência (cole a saída):
    - `OK: handoff acionado pela opção 6`
    - `OK: rótulo handoff = Aguardando equipe`
    - `OK: idempotência no handoff (duplicate)`
- [ ] Handoff visível em `/admin/whatsapp`
  - Resultado esperado: conversa com estado **Aguardando equipe** + log `HANDOFF`.
- [x] Artefatos salvos em `reports/`
  - `reports/whatsapp-meta.txt`
  - `reports/whatsapp-webhook.txt`
  - `reports/whatsapp-webhook-http.txt`
  - `reports/whatsapp-handoff-fase4.txt`

<!-- FASE4_STATUS_AUTO_START -->

### Registro de execução (automático)

- Data/hora (UTC): 2026-05-27T21:15:56.895Z
- Operador: (preencher)
- Branch/HEAD: 7735cc0

#### `reports/whatsapp-meta.txt`

- OK: 4
- Alertas/Falhas: 0
- Linhas OK:
  - OK: subscribe válido retorna challenge
  - OK: token errado → forbidden
  - OK: sem WHATSAPP_VERIFY_TOKEN → missing_config
  - OK: sem challenge → forbidden

#### `reports/whatsapp-webhook.txt`

- OK: 5
- Alertas/Falhas: 0
- Linhas OK:
  - OK: 503 sem WHATSAPP_APP_SECRET
  - OK: 401 assinatura inválida
  - OK: 400 JSON inválido
  - OK: 200 fixture processado
  - OK: idempotência no mesmo messageId

#### `reports/whatsapp-webhook-http.txt`

- OK: 4
- Alertas/Falhas: 0
- Linhas OK:
  - OK: GET handshake Meta (HTTP 200 + challenge)
  - OK: POST sem secret no servidor (HTTP 401)
  - OK: POST fixture assinado (HTTP 200)
  - OK: corpo JSON com processed=1

#### `reports/whatsapp-handoff-fase4.txt`

- OK: 3
- Alertas/Falhas: 0
- Linhas OK:
  - OK: handoff acionado pela opção 6
  - OK: rótulo handoff = Aguardando equipe
  - OK: idempotência no handoff (duplicate)

<!-- FASE4_STATUS_AUTO_END -->

## Resultado atual (staging)

| Área | Status |
|------|--------|
| TypeScript + build | OK |
| `proposta_anexos` M1–M4 | OK (19 propostas, 32 refs, 0 órfãos) |
| CI workflow | OK (`site-ipecc` Actions em `7899f94`+) |
| Upload público | OK (`validate:upload-proposta`) |
| Storage propostas privado | OK |
| **RLS `propostas` anon SELECT** | **OK** (após SQL + ajuste insert sem `.select()`) |
| Git remote | `origin` → `ipecc-whatsapp-leads` · `site-ipecc` espelhado |

## Bloqueador #1 — RLS — **resolvido em staging**

Se INSERT falhar de novo: `docs/sql/hardening-propostas-rls-PASSO5-grants-insert.sql`

Validar: `npm run validar:pos-hardening-rls`

Guia: `docs/HARDENING-RLS-APLICAR-STAGING.md`

## GitHub

Push realizado 2026-05-26 (`2a94f6d` site público, `7899f94` guard, `22f9978` status). Guia: `docs/GITHUB-PUSH.md` · Guard local: `docs/ENTERPRISE-GUARD-LOCAL.md`

## Go-live produção

Somente após staging 100% + autorização: `docs/PROD-PREP-CHECKLIST.md`

## Scripts úteis

| Comando | Uso |
|---------|-----|
| `npm run audit:anexos` | CSV órfãos |
| `npm run sync:proposta-anexos` | Gap tabela vs legado |
| `npm run validar:m4-somente-tabela` | Smoke M4 |
| `npm run correlacionar:orfaos-logs` | Ops |
| `npm run validar:env-whatsapp-meta` | Preflight `.env.local` da Fase 4 |
| `npm run preparar:env-whatsapp-meta -- --aplicar` | Acrescenta template local dry-run (não sobrescreve chaves) |
| `npm run validar:enterprise:fase4` | Gate enterprise com execução automatizada da Fase 4 |
| `npm run fase4:whatsapp-meta` | Coleta + resumo + valida DoD da Fase 4 |
| `npm run validar:whatsapp-handoff-fase4` | Evidência dedicada de handoff (Fase 4) |
| `npm run atualizar:status-fase4-whatsapp` | Atualiza bloco automático da Fase 4 no status |
| `npm run fase4:whatsapp-meta:status` | Executa Fase 4 e atualiza status (sucesso/falha) |
| `npm run fase4:whatsapp-meta:full` | Diagnóstico + execução + atualização de status |
| `npm run verificar:agendamento-enterprise-guard` | Inspeciona tarefas agendadas (normal + Fase 4) |
| `npm run diagnostico:enterprise-operacao` | Panorama operacional (agendamento + último guard + artefatos Fase 4) |
| `npm run check:enterprise-operacao` | Check diário completo de operação enterprise |
| `npm run coletar:evidencias-whatsapp-meta:parcial` | Reports UTF-8 sem credenciais Meta (3/4 completos) |
| `npm run fase4:whatsapp-meta:parcial` | Coleta + DoD parcial + status + checklist |
| `npm run validar:dod-whatsapp-meta:parcial` | DoD parcial (aceita HTTP 503 sem Meta) |
| `npm run validar:enterprise-readiness` | Prontidão ops + Fase 4 parcial/completa |
| `npm run sincronizar:checklist-fase4-status` | Marca checkboxes manuais a partir dos reports |
| `docs/ENTERPRISE-OPERACAO-QUICKSTART.md` | Cheat sheet da operação enterprise |
| `npm run validar:enterprise-ops` | Valida estrutura operacional enterprise (scripts + npm + marcadores) |

## Trilha pública (em andamento)

Padrões: `docs/PUBLICO-PADROES.md` · componentes em `components/public/`

## Commits recentes (trilha)

`22f9978` status ops · `7899f94` guard local · `2a94f6d` landing `/` + `/inicio` + SEO
