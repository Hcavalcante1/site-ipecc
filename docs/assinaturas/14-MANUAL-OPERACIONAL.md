# 14 — Manual operacional

## Pré-requisitos produção
1. SQL `docs/sql/gestao-documental-assinatura-ipecc.sql`  
2. SQL `docs/sql/gestao-documental-assinatura-avancada.sql`  
3. Env: `SIGNATURE_OTP_PEPPER`, Resend (ou `SIGNATURE_OTP_ALLOW_PANEL_FALLBACK=true`)  
4. Env avançada: `SIGNATURE_ADV_PRIVATE_KEY_PEM` (+ version/public opcionais)

## Simples
Admin → Documentos → Assinaturas → **Assinar agora (simples)** → consentimento → OTP → senha → selo.

## Avançada (1 doc)
Assinaturas → **Assinatura avançada** → habilitar identidade → iniciar → consentimento → MFA → autorizar/concluir → `/validar/{codigo}`.

## Lote avançado
Lotes → informar IDs → **Assinar lote avançado** → congelar → consentimentos → MFA → concluir.

## Limitações a comunicar ao usuário
Textos de disclaimer na UI; nunca vender como ICP-Brasil.
