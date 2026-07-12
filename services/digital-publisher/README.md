# Digital Publisher Worker (IPECC)

Worker **externo** que publica posts já **aprovados e agendados** pelo admin.
Não cria conteúdo, não aprova, não escolhe mídia/rede/horário.

## Fluxo

Admin cria → revisa → aprova → agenda → este worker publica → confirma → admin acompanha.

## Local

```bash
cd services/digital-publisher
cp .env.example .env
# preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
# DIGITAL_PUBLISH_DRY_RUN=true (padrão recomendado)
npm install
npx playwright install chromium
npm run dev
```

## Dry-run

Com `DIGITAL_PUBLISH_DRY_RUN=true` o worker valida e simula sucesso **sem** abrir redes reais.

## Docker

Ver `docker-compose.example.yml`.
