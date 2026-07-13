# Documenso (self-host) para o IPECC

Assinatura digital open source para **ente privado**. A API gov.br de órgão público **não** se aplica ao IPECC.

## Subir

```bash
cd services/documenso
cp .env.example .env
# preencha segredos e SMTP
docker compose up -d
```

Abra a URL em `NEXT_PUBLIC_WEBAPP_URL`, crie a conta admin e um **API token**.

## Ligar ao admin IPECC

No `.env.local` / Vercel:

```
DOCUMENSO_API_URL=https://seu-dominio-documenso/api/v2
DOCUMENSO_API_TOKEN=api_xxxx
DOCUMENSO_WEBHOOK_SECRET=opcional
```

Webhook no Documenso apontando para:

`https://www.ipecc.org.br/api/webhooks/documenso`

SQL no Supabase: `docs/sql/gestao-documental-documenso.sql`

## Documentação oficial

- https://docs.documenso.com/docs/self-hosting/deployment/docker-compose
- https://docs.documenso.com/docs/developers
