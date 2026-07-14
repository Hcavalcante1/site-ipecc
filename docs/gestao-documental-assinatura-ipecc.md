# Assinatura Eletrônica IPECC (motor próprio)

Motor interno de assinatura (senha + OTP + evidências + PDF carimbado), sem Documenso/SaaS.

## SQL

Aplicar no Supabase SQL Editor:

`docs/sql/gestao-documental-assinatura-ipecc.sql`

Cria: `gd_signature_evidences`, `gd_signature_otp_challenges`, `gd_validation_lookups`; seed do provedor `ipecc`.

## Fluxo admin

1. Gestão Documental → Assinaturas → criar pedido (provedor `ipecc`) → **Assinar agora**
2. Checkbox de consentimento → OTP por e-mail (Resend) → confirma senha + OTP
3. PDF ganha página de assinatura com QR → status `signed`
4. Validação pública: `/validar/{codigo}`

## Env

- `RESEND_API_KEY` + remetente verificado — envio OTP
- `RESEND_FROM` ou `EMAIL_FROM` — remetente (ex.: `IPECC <noreply@seudominio.com>`); se o domínio não estiver verificado no Resend, o OTP aparece no painel admin para não travar a assinatura institucional
- `EMAIL_ADMIN` / `EMAIL_CONTATO` — fallback de remetente (evite domínio não verificado)
- `SIGNATURE_OTP_PEPPER` — opcional (pepper do hash OTP)
- `SIGNATURE_VALIDATION_BASE_URL` — opcional (default site público)

Sem Resend ou com falha de domínio, o OTP aparece no modal do admin (`devCode`).

## Lote (Fase D)

1. Gestão Documental → Lotes → criar com IDs de documentos
2. **Assinar lote (IPECC)** → consentimento + senha + OTP uma vez
3. Progresso por item; falhas individuais ficam no detalhe do lote

## Multi-signatários

Em `gd_signature_signers`, use `mode=sequential` ou `parallel` e `cargo`.
O documento só fica `signed` quando todos os signatários `required` concluírem.

## Robustez (Fase F)

- Rate limit por IP+usuário nas rotas `.../ipecc/*` e na validação pública `/api/public/validar/{codigo}` (além do cooldown OTP e `max_attempts` no banco).
- Auditoria admin: `/admin/documentos/auditoria` lista evidências IPECC com download de laudo (`.txt` / CSV).
- APIs: `GET /api/admin/documentos/evidencias` e `GET /api/admin/documentos/evidencias/[id]/laudo`.
- Checklist: `npm run validar:documentos`.
