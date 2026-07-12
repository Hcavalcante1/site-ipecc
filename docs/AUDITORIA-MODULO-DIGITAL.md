# Auditoria — módulo Digital

**Data:** 2026-07-12  
**Fonte:** código do repositório (análise read-only).  
**Escopo:** o que é, o que funciona, o que foi implementado, o que falta, SQL, APIs, acesso e riscos.  
**Limite:** status real das tabelas/colunas no Supabase ao vivo **não** foi consultado nesta auditoria — indica-se o que o código espera.

---

## Veredito

O módulo Digital é uma **central editorial assistida** de redes sociais no admin (`/admin/digital`):

- cadastro de **perfis**;
- **fila** de posts;
- **agente** de rascunhos (notícias / eventos / programas);
- publicação **assistida** (copiar/colar) e, opcionalmente, **Instagram via Meta Graph API**.

**Não** é um scheduler multi-rede nem uma integração Meta completa. “Agendado” é lembrete editorial — **não** publica sozinho.

---

## 1. Escopo do módulo

| Capacidade | Descrição |
|------------|-----------|
| Perfis | Instagram, Facebook, YouTube, LinkedIn, TikTok · escopo `site` ou `projeto` |
| Fila | Status: rascunho → aprovado → agendado → publicado → arquivado |
| Agente | Gera rascunhos a partir de conteúdo do site; **sem** publicar |
| Publish assistido | Copiar texto / abrir rede |
| Instagram Graph | `POST media` + `media_publish` (imagem + legenda) |
| Site público | `/api/public/social-links` pode ler `digital_accounts` |

Comentário histórico no SQL da fase 1: *sem publicação automática nas APIs nesta fase*. O SQL de Instagram só adiciona metadados de publish.

---

## 2. Status por capacidade

| Capacidade | Status | Notas |
|------------|--------|-------|
| Perfis (CRUD parcial) | Pronto | Sem DELETE na API/UI |
| Fila editorial | Pronto | Filtro, resumo, vencidos |
| Agente de rascunhos | Pronto | UI + CLI · dedupe por source · sem `media_url` |
| Agendar | Lembrete | Só `scheduled_at` — sem cron |
| Copiar texto / abrir rede | Pronto | Fluxo operacional |
| Publicar Instagram (Graph) | Código ok | Exige token + IG id + imagem pública + SQL publish |
| Publicar outras redes | Ausente | Só orientação de copiar/colar |
| Acesso operador (`mod_digital`) | Código ok | SQL da coluna precisa estar aplicado no banco |
| Links sociais no site | Pronto | Fallback estático se tabela ausente |

---

## 3. Arquivos principais

### UI admin

| Path | Papel |
|------|--------|
| `app/admin/digital/page.tsx` | Abas Fila / Perfis |
| `app/admin/digital/layout.tsx` | `RequireAdminModulo modulo="digital"` |
| `app/admin/layout.tsx` | Menu “Digital” se `pode("digital")` |
| `app/admin/components/RequireAdminModulo.tsx` | Guard de cliente |
| `app/admin/acessos/page.tsx` | Checkbox Digital no escopo |

### APIs admin

| Path | Métodos |
|------|---------|
| `app/api/admin/digital/accounts/route.ts` | GET, POST, PATCH |
| `app/api/admin/digital/posts/route.ts` | GET, POST, PATCH |
| `app/api/admin/digital/generate/route.ts` | POST |
| `app/api/admin/digital/publish/route.ts` | POST (Instagram) |
| `app/api/admin/acessos/route.ts` | Lê/grava `mod_digital` |

### API pública

| Path | Papel |
|------|--------|
| `app/api/public/social-links/route.ts` | Contas site ativas ou fallback |
| `components/public/PublicSocialLinks.tsx` | Consome a API |

### Lib

| Path | Papel |
|------|--------|
| `lib/digital/types.ts` | Plataformas, status, tipos |
| `lib/digital/labels.ts` | Rótulos PT + ajuda de publicação |
| `lib/digital/templates.ts` | Templates notícia/evento/projeto |
| `lib/digital/draftAgent.ts` | Agente de rascunhos |
| `lib/digital/instagramPublish.ts` | Graph API |
| `lib/digital/adminGate.ts` | `denyIfSemModuloDigital()` |
| `lib/digital/index.ts` | Reexports |
| `lib/auth/adminEscopo.ts` | Módulo `"digital"` ↔ `mod_digital` |
| `lib/auth/adminSession.ts` | Carrega escopos (fallback se coluna ausente) |
| `lib/auth/processoLabels.ts` | Chip “Digital” |

### Scripts

| Path / comando | Uso |
|----------------|-----|
| `scripts/aplicar-digital-redes-fase1.cjs` | Aplica SQL fase 1 |
| `scripts/aplicar-digital-instagram-publish.cjs` | Aplica colunas de publish |
| `scripts/aplicar-admin-escopos-mod-digital.cjs` | Aplica `mod_digital` |
| `npm run validar:digital` | Asserts estáticos (`validar-digital-fase1.ts`) |
| `npm run digital:gerar-rascunhos` | CLI do agente |
| `scripts/verificar-digital-accounts.ts` | Lista contas site |
| `npm run validar:admin-acessos` | Inclui checagem de `mod_digital` |

---

## 4. O que foi implementado (detalhe)

### Perfis (`digital_accounts`)

- Criar / editar (rótulo, URL, handle, `projeto_ref`) / ativar-desativar.
- Plataformas: Instagram, Facebook, YouTube, LinkedIn, TikTok.
- Escopo `site` ou `projeto`.
- Seed SQL com links institucionais IPECC.
- Sem DELETE.

### Fila (`digital_posts` + `digital_post_targets`)

- Post manual com destinos (perfis ativos).
- Listagem (até 100) + resumo por status + agendamentos vencidos.
- Editar texto/hashtags/mídia/destinos em `draft` \| `approved` \| `scheduled`.
- Aprovar, arquivar, “Marcar publicado nas redes”.
- Copiar texto / copiar link; “Abrir {plataforma}”.

### Agente

- Rascunhos de notícias publicadas, eventos, programas (`PROJETOS_DESTAQUE`).
- Deduplica por `(source_type, source_id)` (exceto arquivados).
- Vincula a contas `scope=site` ativas.
- UI: “Gerar rascunhos (agente)” + CLI.

### Agendamento

- Status `scheduled` + `scheduled_at`.
- UI alerta vencidos; texto: lembrete editorial — **sem envio automático**.
- Sem cron/job.

### Publicação Instagram

- Botão para posts `approved` ou `scheduled`.
- Exige `media_url` http(s) e destino Instagram ativo.
- Grava `published_via=instagram_api`, `external_post_id`; em falha, `publish_error`.
- Status final ainda usa `published_manual` (nome legado; mitigado por `published_via`).

### Não implementado no código

- Publicação API Facebook / YouTube / LinkedIn / TikTok.
- Stories, Reels, carrossel, vídeo.
- Upload de mídia (só URL pública).
- Exclusão física de posts/contas.
- Filtro / isolamento de posts por `processo_id` (tabelas Digital **não** têm processo).
- OAuth Meta por conta / token por perfil em `digital_accounts`.

---

## 5. Controle de acesso

### Fluxo

1. **Mestre** (`papel === "mestre"` ou `legadoIsAdmin`): todos os módulos, incluindo `digital`.
2. **Operador/externo**: só se algum escopo tiver `mod_digital === true`.
3. **UI:** `app/admin/digital/layout.tsx` → `RequireAdminModulo`; sem permissão redireciona para `/admin`.
4. **Menu:** `app/admin/layout.tsx` — link só se `pode("digital")`.
5. **APIs:** `denyIfSemModuloDigital()` → sessão + `podeModulo(..., "digital")`; 403 se faltar.
6. **Acessos (mestre):** checkbox Digital → insert `mod_digital`; chip via `chipsModulosEscopo`.

### Observação de modelo

A flag `mod_digital` está **amarrada a um processo** em `admin_escopos`, mas os dados Digital são **globais** (sem `processo_id` nas tabelas `digital_*`). Qualquer operador com a flag vê/edita a fila institucional inteira.

### Gate vs RLS

- Gate de app nas APIs (service role).
- Tabelas Digital: RLS ligado; leitura pública tipicamente só de contas site ativas.
- `multi-admin-processos-fase-2-rls.sql` reconhece `'digital'` em `admin_tem_modulo_processo`, mas **não** cria policies RLS específicas nas tabelas `digital_*` para escrita por escopo (escrita via service role nas APIs admin).

---

## 6. SQL

### Arquivos

| Arquivo | Papel |
|---------|--------|
| `docs/sql/digital-redes-fase1.sql` | Tabelas `digital_accounts`, `digital_posts`, `digital_post_targets` + índices + seed + RLS |
| `docs/sql/digital-redes-instagram-publish.sql` | Colunas `external_post_id`, `publish_error`, `published_via` |
| `docs/sql/admin-escopos-mod-digital.sql` | `ALTER TABLE admin_escopos ADD COLUMN mod_digital ...` |
| `docs/sql/multi-admin-processos-fase-2-rls.sql` | Case `'digital' then e.mod_digital` |

### Alinhamento código ↔ schema

| Esperado no código | Origem SQL |
|--------------------|------------|
| Contas / posts / targets | fase 1 |
| Metadados de publish Instagram | instagram-publish |
| `admin_escopos.mod_digital` | admin-escopos-mod-digital |

### Comportamento se faltar SQL

| Falta | Efeito típico |
|-------|----------------|
| Tabelas fase 1 | APIs accounts/posts/generate avisam para aplicar o SQL |
| Colunas publish | `publish/route.ts` sugere o SQL de Instagram |
| Coluna `mod_digital` | GET `/api/admin/acessos` pode falhar com mensagem explícita; sessão tem fallback sem a coluna (Digital fica false para operador) |

### Ação pendente (operacional)

Aplicar no SQL Editor do Supabase (ou via script com senha DB):

```sql
-- docs/sql/admin-escopos-mod-digital.sql
ALTER TABLE public.admin_escopos
  ADD COLUMN IF NOT EXISTS mod_digital boolean NOT NULL DEFAULT false;
```

Depois marcar **Digital** no escopo do operador em `/admin/acessos`.

---

## 7. Integrações externas (Meta / Instagram)

### Implementação

- `lib/digital/instagramPublish.ts`
- Fluxo: `POST /{ig-user-id}/media` (image_url + caption) → `POST .../media_publish`
- Versão padrão: `v21.0`

### Variáveis de ambiente

| Variável | Obrigatória para publish? | Uso |
|----------|---------------------------|-----|
| `META_GRAPH_ACCESS_TOKEN` | Sim | Token Graph |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Sim | IG user id profissional |
| `META_GRAPH_API_VERSION` | Não | Default `v21.0` |
| `NEXT_PUBLIC_SITE_URL` | Não | Links nos templates (fallback site IPECC) |
| `SUPABASE_SERVICE_ROLE_KEY` + URL | Sim (admin) | Persistência |
| `DATABASE_URL` / `SUPABASE_DB_PASSWORD` | Para scripts SQL | Aplicar migrações |

Um token **global** no servidor — destinos Instagram em `digital_accounts` **não** escolhem a conta da API.

### Ready vs blocked

| Capacidade | Estado |
|------------|--------|
| Fila + perfis + agente + copiar/colar | Ready (se SQL fase 1) |
| Links públicos | Ready (com fallback) |
| Publicar Instagram | Código ready; runtime blocked sem token + IG id + conta profissional + permissões + imagem pública + SQL publish |
| Publish outras redes | Não existe |
| Agendar → publicar sozinho | Não existe |

---

## 8. Gaps / backlog

1. Aplicar `admin-escopos-mod-digital.sql` no Supabase (se ainda não aplicado).
2. Token Meta + IG Business + imagem pública (go-live Instagram).
3. Publicação automática no horário agendado.
4. APIs Facebook / LinkedIn / YouTube / TikTok.
5. Upload / biblioteca de mídia no admin.
6. Isolar dados Digital por processo (hoje global).
7. OAuth / token por conta Instagram no banco.
8. DELETE de posts/contas; agente preenchendo `media_url`.
9. Links de notícia no template apontam para `/inicio` (não URL da notícia).
10. Documentar Digital em `docs/ADMIN-SITE-VS-PROCESSO.md`.
11. Testes além dos asserts estáticos de `validar:digital`.

---

## 9. Riscos / débitos técnicos

1. **Token Meta global** — um `INSTAGRAM_BUSINESS_ACCOUNT_ID`; multi-conta no banco não controla a API.
2. **Status `published_manual`** também para publish via API — confuso (mitigado por `published_via`).
3. **Operador com Digital vê fila inteira** — permissão por processo, dados sem isolamento.
4. **Service role nas APIs** — quem tem o módulo escreve em todas as `digital_*`.
5. **Agendamento sem executor** — risco de achar que “agendado” = publicado.
6. **Três migrações SQL** — fase1 + instagram-publish + mod_digital.
7. **Instagram exige URL pública de imagem** — sem upload, publish costuma ficar bloqueado na prática.
8. **Deduplicação do agente** — índice único por source; reabrir conteúdo arquivado exige contorno.
9. **Fallback de eventos** no agente pode incluir eventos não publicados se o filtro `publicado` falhar.

---

## 10. Resumo em uma frase

O módulo Digital no código é uma **central editorial de redes** (perfis + fila + agente + publish assistido Instagram), integrada ao pacote de **Acessos via `mod_digital`**, com schema e scripts prontos; **não** é um scheduler multi-rede nem uma integração Meta completa — Instagram Graph só sobe se tokens, SQL de publish e imagem pública estiverem no ar.

---

## Histórico relacionado (código)

- Commit de escopo Digital no pacote Acessos: `13d2e0e` (`feat(acessos): incluir modulo Digital no escopo por login`).
- Canvas visual da mesma auditoria (IDE): `auditoria-modulo-digital.canvas.tsx` (pasta de canvases do Cursor).
