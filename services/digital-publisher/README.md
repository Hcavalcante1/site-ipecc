# Digital Publisher Worker (IPECC)

Worker **externo** que publica posts já **aprovados e agendados** pelo admin.
Não cria conteúdo, não aprova, não escolhe mídia/rede/horário.

## Fluxo

Admin cria → revisa → aprova → agenda → este worker publica → confirma → admin acompanha.

## Pré-requisitos Supabase

1. SQL Digital: `docs/sql/digital-redes-fase1.sql` + `digital-redes-automation-phase1.sql`
2. Bucket Storage: `docs/sql/digital-media-storage-bucket.sql` (privado `digital-media`)

## Local (desenvolvimento)

```bash
cd services/digital-publisher
cp .env.example .env
# preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
npm install
npx playwright install chromium
npm run dev
```

## Conectar conta (login manual)

1. No admin `/admin/digital` → Perfis → **Conectar (browser)**
2. Com o worker rodando (`npm run dev`), abre um **Chromium visível**
3. Faça login na rede (Instagram etc.) — **não envie senha ao IPECC**
4. Ao detectar sessão válida, status vira `connected`

## Dry-run vs publicação real

| Variável | Valor | Efeito |
|----------|-------|--------|
| `DIGITAL_PUBLISH_DRY_RUN=true` | padrão | Simula sucesso, não publica |
| `DIGITAL_PUBLISH_DRY_RUN=false` | produção | Playwright real (conta conectada + mídia) |

Post individual: checkbox dry-run na fila ou API `publish-now`.

## Docker (VPS / máquina dedicada)

```bash
cd services/digital-publisher
cp .env.example .env
# DIGITAL_PUBLISH_DRY_RUN=false para publicação real
docker compose -f docker-compose.example.yml up -d --build
curl http://localhost:8791/   # health JSON
```

**Importante:** Vercel **não** roda Playwright. O worker fica fora (Docker, VPS ou PC local).

## Health

`GET :8791/` → `{ ok, service, workerId, dryRun }`

## Logs

Tabela `digital_publish_logs` no Supabase (eventos `account_connect_*`, `publish_*`, `job_*`).
