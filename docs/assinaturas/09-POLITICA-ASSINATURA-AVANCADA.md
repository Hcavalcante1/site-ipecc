# 09 — Política — Assinatura eletrônica avançada

## Definição
Modalidade com identidade habilitada, consentimento expresso, reautenticação, MFA, documento congelado, manifesto Ed25519, certificado de evidências e auditoria append-only.

## O que NÃO é
Não é assinatura qualificada nem ICP-Brasil. Destinatários/editais podem exigir outro método.

## Pré-requisitos
Identidade `VERIFIED` em `gd_adv_identity_verifications`; e-mail verificado; usuário não suspenso/revogado.

## Controles exclusivos do signatário
Somente o próprio `signer_user_id` inicia, consente, autentica e conclui. Admin não assina por terceiro.

## Lote
Autorização única; evidência e certificado por documento; hash do conjunto imutável.
