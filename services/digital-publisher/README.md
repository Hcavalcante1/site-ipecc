# Digital Publisher Worker (IPECC)

Worker **externo** que publica posts já **aprovados e agendados** pelo admin.
Não cria conteúdo, não aprova, não escolhe mídia/rede/horário.

## Fluxo

Admin cria → revisa → aprova → agenda → este worker publica → confirma → admin acompanha.

## Pré-requisitos Supabase

1. SQL Digital: `docs/sql/digital-redes-fase1.sql` + `digital-redes-automation-phase1.sql`
2. Bucket Storage: `docs/sql/digital-media-storage-bucket.sql` (privado `digital-media`)

## Publicar pelo PC (agente residente — recomendado)

Instalação **uma vez** (Agendador de Tarefas). Depois só o admin.

Guia: [`docs/DIGITAL-PUBLISHER-AGENTE-WINDOWS.md`](../../docs/DIGITAL-PUBLISHER-AGENTE-WINDOWS.md)

```powershell
node scripts/aplicar-digital-agents-resident.cjs
powershell -ExecutionPolicy Bypass -File scripts\install-digital-agent-windows.ps1
```

## Local (desenvolvimento / dry-run)

Na raiz do projeto (usa `.env.local`):

```bash
node scripts/run-digital-publisher.cjs
```

Publicação real pontual (sem Agendador):

```bash
node scripts/run-digital-publisher.cjs --publish
```

Ou manualmente:

```bash
cd services/digital-publisher
cp .env.example .env
# preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
npm install
npx playwright install chromium
npm run dev
```

Verificar Supabase:

```bash
node scripts/probe-digital-readiness.cjs
```

## Conectar conta (login manual)

1. No admin `/admin/digital` → Perfis → **Conectar (browser)**
2. O worker abre o **Chrome instalado no PC** (não o Chromium do Playwright — a Meta bloqueia)
3. Faça login na rede — **não envie senha ao IPECC**
4. Ao detectar cookie de sessão, status vira `connected`

Se a Meta ainda bloquear: use o Instagram Graph (token) como contingência, ou faça login no Chrome normal uma vez e tente de novo no Conectar.

## Dry-run vs publicação real

| Variável | Valor | Efeito |
|----------|-------|--------|
| `DIGITAL_PUBLISH_DRY_RUN=true` | padrão | Simula sucesso, não publica |
| `DIGITAL_PUBLISH_DRY_RUN=false` | produção | Playwright real (conta conectada + mídia) |

Post individual: checkbox dry-run na fila ou API `publish-now`.

## Docker / VPS 24h

Guia completo: [`docs/DIGITAL-PUBLISHER-VPS.md`](../../docs/DIGITAL-PUBLISHER-VPS.md)

```bash
# Na raiz do projeto (gera .env do worker a partir do .env.local)
node scripts/gerar-env-digital-publisher-vps.cjs

cd services/digital-publisher
docker compose up -d --build
curl http://127.0.0.1:8791/
```

**Importante:** Vercel **não** roda Playwright. O worker fica no VPS (ou PC).  
Login Meta: preferir no PC e copiar `data/browser-profiles` para o VPS.

## Health

`GET :8791/` → `{ ok, service, workerId, dryRun }`

## Logs

Tabela `digital_publish_logs` no Supabase (eventos `account_connect_*`, `publish_*`, `job_*`).
