# Worker Digital IPECC — VPS 24 horas

A Vercel **não** roda este serviço. Em produção o worker fica em um VPS com Docker.

**Sem VPS?** Use o **agente residente Windows** (recomendado, R$ 0): [`DIGITAL-PUBLISHER-AGENTE-WINDOWS.md`](./DIGITAL-PUBLISHER-AGENTE-WINDOWS.md)  
Sob demanda (legado): [`DIGITAL-PUBLISHER-PC.md`](./DIGITAL-PUBLISHER-PC.md)

## O que o VPS faz

- Publica posts **aprovados/agendados** (Playwright headless)
- Mantém sessões em volume Docker (cookies)
- Health: `http://IP:8791/`

## O que continua no seu PC (raro)

- **Conectar (browser)** com login Meta — a Meta costuma bloquear login em servidor.
- Fluxo recomendado:
  1. Conectar no PC (Chrome) até `connected`
  2. Copiar pasta de perfil para o VPS (uma vez)
  3. VPS publica headless no dia a dia

## 1. Criar VPS

Qualquer cloud barata com Ubuntu 22.04+:

- Hetzner CX22 / DigitalOcean Droplet 2 GB / Oracle Free Tier

Abra porta **8791/tcp** (só seu IP, se possível).

## 2. Instalar Docker no VPS

```bash
sudo apt update && sudo apt install -y ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# saia e entre de novo no SSH
docker --version
```

## 3. Subir o worker

```bash
git clone https://github.com/Hcavalcante1/site-ipecc.git
cd site-ipecc/services/digital-publisher
cp .env.example .env
nano .env
```

Preencha no `.env`:

```env
SUPABASE_URL=https://eohshxaxbsdpxundsley.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...   # service role (nunca no front)
DIGITAL_WORKER_ID=worker-vps
DIGITAL_PUBLISH_DRY_RUN=false
DIGITAL_BROWSER_CHANNEL=chromium
DIGITAL_BROWSER_HEADLESS=true
PORT=8791
```

Suba:

```bash
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:8791/
docker compose logs -f --tail=100
```

Resposta esperada:

```json
{"ok":true,"service":"digital-publisher","workerId":"worker-vps","dryRun":false}
```

## 4. Copiar sessão do PC → VPS (após Conectar no PC)

No PC (PowerShell), depois de conectar Instagram/Facebook:

```powershell
# ajuste o UUID da conta em .browser-profiles/chrome/
scp -r services/digital-publisher/.browser-profiles/chrome USER@IP_DO_VPS:/tmp/ipecc-profiles
```

No VPS:

```bash
docker compose stop
# volume path varia; forma simples: copiar para bind mount
# alternativa: docker cp
docker volume ls | grep browser
# copie os arquivos para o volume ou use bind mount (veja seção abaixo)
docker compose start
```

### Bind mount (mais simples para copiar sessão)

No `docker-compose.yml`, troque o volume nomeado por:

```yaml
    volumes:
      - ./data/browser-profiles:/app/.browser-profiles
```

No VPS:

```bash
mkdir -p data/browser-profiles/chrome
# cole aqui as pastas UUID do PC
docker compose up -d --build
```

No worker Docker o caminho interno é `/app/.browser-profiles/chrome/{accountId}` (mesmo layout do PC).

## 5. Atualizar o worker

```bash
cd ~/site-ipecc
git pull
cd services/digital-publisher
docker compose up -d --build
```

## 6. Checklist

- [ ] `.env` com service role
- [ ] `DIGITAL_PUBLISH_DRY_RUN=false`
- [ ] `curl` health OK
- [ ] Conta `connected` + automação ON no admin
- [ ] Post aprovado → Publicar agora → log `publish_*` no Supabase

## Segurança

- Não exponha `8791` para a internet inteira sem firewall
- Nunca commite `.env`
- Service role só no VPS / `.env.local` do PC
