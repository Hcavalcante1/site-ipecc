# Motor de assinatura Documento (self-host)

O admin IPECC chama isso de **Documento**. Esta pasta sobe o motor open source
compatível (imagem open-source do motor) usado só no servidor.

## Subir

```bash
cd services/documenso
cp env.example .env
# preencha segredos e SMTP
docker compose up -d
```

Crie um API token no painel do motor.

## Ligar ao IPECC (Vercel / .env.local)

```
DOCUMENTO_API_URL=https://seu-dominio/api/v2
DOCUMENTO_API_TOKEN=api_xxxx
DOCUMENTO_WEBHOOK_SECRET=opcional
```

Webhook no motor → `https://www.ipecc.org.br/api/webhooks/documento`

SQL: `docs/sql/gestao-documental-documenso.sql`
