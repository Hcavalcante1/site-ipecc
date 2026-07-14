# Fase 4 — Arquitetura da Assinatura Avançada

**Data:** 2026-07-14  
**SQL:** `docs/sql/gestao-documental-assinatura-avancada.sql`

## Princípios

- Módulo **independente** do motor simples (`lib/documentos/signing/`).
- Exige identidade habilitada (`gd_adv_identity_verifications`).
- Consentimento expresso versionado.
- Reautenticação (senha) + MFA (OTP e-mail) com desafio de uso único (5 min).
- Congelamento do PDF original + hash SHA-256 no servidor.
- Manifesto canônico selado com **Ed25519** (chave privada só em env).
- Artefatos: original, signed.pdf, evidence.json, evidence-certificate.pdf, signed-manifest.json.
- Eventos append-only com hash encadeado (`gd_adv_events`).
- **Não** é ICP-Brasil / assinatura qualificada.

## Fluxo

```text
identidade VERIFIED
→ POST /api/admin/documentos/assinaturas-avancadas
→ consentimento + documentViewed
→ POST .../mfa (desafio)
→ POST .../autorizar (senha + OTP)
→ POST .../concluir (carimbo + manifesto + certificado)
→ /validar/{codigo} (bifurca ADVANCED)
```

## APIs

| Método | Rota |
|--------|------|
| POST | `/api/admin/documentos/assinaturas-avancadas` |
| POST | `/api/admin/documentos/assinaturas-avancadas/[id]/consentimento` |
| POST | `/api/admin/documentos/assinaturas-avancadas/[id]/mfa` |
| POST | `/api/admin/documentos/assinaturas-avancadas/[id]/autorizar` |
| POST | `/api/admin/documentos/assinaturas-avancadas/[id]/concluir` |
| GET/POST | `/api/admin/documentos/identidade-avancada` |

## Env

- `SIGNATURE_ADV_PRIVATE_KEY_PEM` (obrigatório em produção)
- `SIGNATURE_ADV_PUBLIC_KEY_PEM` (opcional; derivada se ausente)
- `SIGNATURE_ADV_KEY_VERSION` (default `v1`)
- `SIGNATURE_OTP_ALLOW_PANEL_FALLBACK` (mesmo do simples)

## Código

- `lib/documentos/assinaturas/advanced/advancedSignService.ts`
- `lib/documentos/assinaturas/advanced/identityService.ts`
- `lib/documentos/assinaturas/advanced/auditService.ts`
- `lib/documentos/assinaturas/shared/crypto.ts`
- `AdvancedSignatureProvider`
