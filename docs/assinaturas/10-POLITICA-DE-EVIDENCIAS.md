# 10 — Política de evidências

## Simples
`gd_signature_evidences`: hashes, consentimento, IP/UA, código de validação, PDF carimbado.

## Avançada
Artefatos em `gd_adv_artifacts`:
- ORIGINAL_DOCUMENT
- SIGNED_ADVANCED_DOCUMENT
- EVIDENCE_CERTIFICATE
- EVIDENCE_JSON
- SIGNED_MANIFEST

Eventos em `gd_adv_events` (imutáveis via trigger).

## Retenção
Evidências de assinatura são preservadas enquanto houver obrigação legal/operacional do processo; não há soft-delete nas tabelas avançadas de eventos/artefatos.

## Não armazenar
Senhas, OTP em claro, chave privada, biometria (não implementada).
