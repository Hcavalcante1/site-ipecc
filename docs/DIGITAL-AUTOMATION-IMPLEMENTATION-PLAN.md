# Plano de implementação — Automação Digital IPECC

**Data:** 2026-07-12  
**Escopo definitivo:** automação **técnica da publicação**, não automação editorial.

---

## Declaração explícita (inegociável)

1. **Fluxo principal:** o administrador controla o conteúdo e as decisões editoriais.
2. **A publicação automática (Playwright) começa somente depois** que o post estiver aprovado e agendado (ou “Publicar agora”).
3. **A automação de redes** automatiza a **execução técnica** da publicação — não substitui o admin no fluxo padrão.

### Fluxo principal (padrão)

```text
ADMIN CRIA
→ ADMIN REVISA
→ ADMIN APROVA
→ ADMIN AGENDA
→ SCRIPT PUBLICA SOZINHO
→ SISTEMA CONFIRMA
→ ADMIN ACOMPANHA
```

### Opção adicional: agentes de criação (opt-in)

**Sim, é possível** — como **modo opcional**, desligado por padrão, ativado só pelo admin.

| Modo | Quem cria o rascunho | Quem aprova / agenda | Quem publica |
|------|----------------------|----------------------|--------------|
| **Manual** (padrão) | Admin | Admin | Worker (se agendado) |
| **Assistido** (já parcial) | Agente gera rascunho; admin edita | Admin | Worker |
| **Agente opt-in** (fase posterior) | Agente cria rascunhos a partir de fontes | **Ainda Admin** (ou janela supervisionada se o admin ligar) | Worker só após aprovação/agenda |

Regras da opção de agentes:

- Nunca é o padrão de fábrica.
- Exige flag explícita (ex.: `agent_drafts_enabled` / modo “Agente auxiliar”).
- Por padrão o agente **só cria rascunhos** (`draft`) — **não** aprova, **não** agenda, **não** publica.
- Publicação continua sempre via worker após aprovação + agenda (ou Publicar agora).
- Um modo “agente + auto-aprovar” só existiria se o admin **ligar conscientemente** uma segunda flag (fora do MVP da publicação técnica).

Ordem: **primeiro** fila + worker Playwright (publicação técnica); **depois** evoluir o agente de rascunhos existente para a opção opt-in — sem misturar as duas entregas.

---

## O que NÃO será o fluxo padrão

- Agente aprovando ou publicando sozinho sem flag explícita
- IA escolhendo rede/horário/mídia no lugar do admin (no padrão)
- Substituição do administrador no dia a dia

> O `draftAgent` atual (gerar rascunhos) permanece como base da opção assistida/opt-in; o admin continua obrigado a revisar/aprovar/agendar no fluxo padrão.

---

## O que SERÁ implementado

Eliminar tarefas manuais de execução:

- abrir cada rede;
- login repetido (após conectar sessão uma vez);
- copiar/colar texto;
- anexar mídia na rede;
- clicar publicar em cada rede;
- conferir sucesso manualmente;
- repetir falha temporária à mão.

Transformar post **aprovado + agendado** (ou Publicar agora) em publicação real automática via **Playwright + sessão autenticada**.

---

## Estado atual (ponto de partida)

| Item | Situação |
|------|----------|
| `/admin/digital` Fila / Perfis | Existe — preservar |
| CRUD posts, aprovar, agendar | Existe — `scheduled_at` ainda é lembrete |
| Copiar texto / abrir rede / marcar publicado | Existe — manter como `manual` |
| Agente de rascunhos | Existe — apoio editorial, não publisher |
| Instagram Graph API | Existe — marcar **legado** (`api_legacy`), não padrão |
| Worker / Playwright / locks / status por destino | Ausente |
| Biblioteca de mídia Digital | Ausente (`media_url` texto) |
| `mod_digital` / links públicos | Preservar |

Status editorial atual no banco: `draft | approved | scheduled | published_manual | archived`.

---

## Comportamento ao fim da implantação

1. Admin cria post, escolhe mídia, seleciona redes, ajusta versões, aprova, agenda (ex.: 20/07 18h), sai.
2. Às 18h o worker: claim → lock → publica Instagram → confirma → Facebook → … → atualiza painel.
3. Resultado por rede independente (ex.: LinkedIn falhou por sessão; demais publicados).
4. Destinos já `published` **não** republicam; admin pode **Repetir** só o falho.
5. Admin permanece dono de criar/editar/mídia/redes/aprovar/agenda/cancelar/arquivar/pausar/reconectar.

### Elegibilidade para publicação automática

- post aprovado (fluxo editorial);
- `status = scheduled` e `scheduled_at <= agora`, **ou** enfileirado via Publicar agora;
- conta ativa; automação habilitada; estratégia `browser` (ou `api_legacy` se explicitamente ligada);
- mídia válida quando exigida;
- destino selecionado e ainda não publicado com sucesso.

---

## Arquitetura

```text
Admin Digital (Next.js)
  → digital_posts / digital_post_targets / digital_media
  → fila + locks (Postgres)
  → services/digital-publisher (worker persistente)
  → Playwright + sessão criptografada
  → rede social
  → confirmação (URL / evidência / status)
  → painel admin
```

- **Next.js:** criação, edição, aprovação, agendamento, mídia, fila, status, logs, comandos manuais.
- **Worker:** **não decide conteúdo**; só executa instruções já aprovadas.
- **Não criar** `services/digital-editorial-agent/`.

Workers em VPS/Docker — não Playwright em serverless Vercel.

### Estratégias por conta

| Estratégia | Uso |
|------------|-----|
| `manual` | Copiar / abrir rede / marcar publicado |
| `browser` | **Padrão de automação** — Playwright |
| `api_legacy` | Instagram Graph antigo — isolado, desativável, não requisito |

Sem dependência de Meta Graph / Business Verification / Ayrshare / Hootsuite / Buffer etc. para o caminho principal.

---

## Modelo de dados (migração additive)

Arquivo: `docs/sql/digital-redes-automation-phase1.sql` (`IF NOT EXISTS`, sem DROP destrutivo).

### `digital_accounts`

- `automation_enabled`, `automation_strategy` (`manual|browser|api_legacy`)
- `connection_status` (`disconnected|connecting|connected|expired|blocked|challenge_required|error`)
- `session_reference`, `browser_profile_reference`
- `last_connected_at`, `last_connection_check_at`, `last_connection_error`
- `requires_reconnect`, `publisher_config` (jsonb — **sem senha**)

### `digital_posts`

- `automation_status` (`pending|queued|processing|partially_published|published|failed|cancelled`)
- `publish_attempts`, `next_attempt_at`
- `locked_at`, `locked_by`, `lock_expires_at`
- `last_publish_error`, `published_at`, `dry_run`
- `content_variants` (jsonb) — versões **editadas pelo admin** por rede

Preservar `status` editorial existente; mapear `published_manual` legado.

### `digital_post_targets`

- `publish_status`, `publish_strategy`
- timestamps, `external_post_url`, `external_post_id`
- `publish_error`, `error_code`, `attempt_count`, `next_attempt_at`
- `evidence_path`, `publisher_response`

Estados destino: `pending|queued|processing|published|failed|reconnect_required|challenge_required|skipped|cancelled`

### Novas tabelas

- `digital_publish_logs` — auditoria de execução
- `digital_media` — biblioteca escolhida pelo admin + bucket `digital-media`

---

## Biblioteca de mídia

- Admin faz upload e escolhe a mídia do post
- MIME: jpeg, png, webp, mp4
- Validação de extensão, tamanho, path, auth
- Sistema **não** escolhe mídia automaticamente

---

## Worker `services/digital-publisher/`

Estrutura conforme briefing (config, worker, browser/, jobs/, publishers/ dry-run + browser por rede + `instagram-api-legacy`).

Ordem de redes: Instagram → Facebook → LinkedIn → TikTok → YouTube (uma por vez).

`DIGITAL_PUBLISH_DRY_RUN=true` por padrão até validação.

Sessão: conectar no admin → browser visível → login/2FA manual → sessão criptografada (`DIGITAL_SESSION_ENCRYPTION_KEY`) — sem senha no formulário/Supabase/.env.

---

## Interface admin (preservar layout)

**Perfis:** estratégia, automação, status conexão, erros, Conectar / Reconectar / Testar / Desativar.

**Fila:** status geral + por rede, tentativas, URL, evidência, Repetir falha, Publicar agora (enfileira, não roda Playwright na request).

Post `published` só se todos os destinos selecionados estiverem `published` ou `skipped` válido; senão `partially_published`.

---

## Retentativas

Temporária: 5 min → 30 min → 2 h → intervenção.

Não auto-retry: sessão expirada, CAPTCHA, 2FA, bloqueio, mídia inválida, rejeição, duplicidade, confirmação ausente.

Sucesso exige confirmação real (mensagem/URL/post visível/evidência), não só clique.

---

## Sequência de implementação

1. Auditar (feito) + este plano  
2. Migração SQL  
3. Biblioteca de mídia  
4. Fila real + locks  
5. Worker + dry-run  
6. Status por destino na UI  
7. Conexão de contas + sessão  
8. Instagram browser  
9. Facebook → LinkedIn → TikTok → YouTube  
10. Testes + docs + publicação real controlada + relatório final  

---

## Critério principal de aceite

1. Admin cria post  
2. Escolhe mídia  
3. Escolhe redes  
4. Edita versões  
5. Aprova  
6. Agenda  
7. Não faz mais nada  
8. No horário o worker publica  
9. Resultados independentes por rede  
10. URLs/evidências no admin  
11. Repetir falha sem republicar sucessos  

**Violação de escopo:** sistema criar, escolher pauta, aprovar ou agendar sozinho.  
**Incompleto:** admin ainda abrir cada rede para publicar.

---

## Rollback

- Pausar automação / `automation_enabled=false` / strategy=`manual`
- Parar container do worker
- Contingência manual + Graph legado intactos
- Sem migrações destrutivas

---

## Arquivos principais

**Criar:** SQL + apply script; APIs media / publish-now / retry / connect; `services/digital-publisher/**`; docs finais.

**Alterar:** `lib/digital/types.ts`, `labels.ts`, `page.tsx` (fila/perfis), accounts/posts routes; marcar Graph como legado.

**Não criar:** `services/digital-editorial-agent/`, scanner autônomo, campaign planner autônomo.
