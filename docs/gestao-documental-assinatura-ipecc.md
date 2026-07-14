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
- `RESEND_FROM` ou `EMAIL_FROM` — remetente (ex.: `IPECC <noreply@seudominio.com>`); se o domínio não estiver verificado no Resend, configure `SIGNATURE_OTP_ALLOW_PANEL_FALLBACK=true` para ecoar o OTP no painel (risco operacional aceito)
- `EMAIL_ADMIN` / `EMAIL_CONTATO` — fallback de remetente (evite domínio não verificado)
- `SIGNATURE_OTP_PEPPER` — **obrigatório em produção** (pepper do hash OTP); em desenvolvimento aceita fallback via `NEXTAUTH_SECRET`
- `SIGNATURE_OTP_ALLOW_PANEL_FALLBACK` — `true` para permitir código OTP no painel quando o e-mail falha (em produção o padrão é **não** ecoar)
- `SIGNATURE_VALIDATION_BASE_URL` — opcional (default site público)

Sem Resend em desenvolvimento, o OTP pode aparecer no modal do admin (`devCode`). Em produção, sem Resend/flag, a operação falha de forma segura.

## Lote (Fase D)

1. Gestão Documental → Lotes → criar com IDs de documentos
2. **Assinar lote (IPECC)** → consentimento + senha + OTP uma vez
3. Progresso por item; falhas individuais ficam no detalhe do lote

## Multi-signatários

Em `gd_signature_signers`, use `mode=sequential` ou `parallel` e `cargo`.
O documento só fica `signed` quando todos os signatários `required` concluírem.

## Carimbo (modelo gov.br)

Selo compacto no espírito do verificador gov.br / ITI:

1. Marca **IPECC** (não usa logo oficial gov.br)
2. `Documento assinado digitalmente`
3. **NOME** (uma vez)
4. `Data: dd/mm/aaaa hh:mm:ss -0300`
5. CPF / cargo miúdo + `Verifique em …/validar/CÓDIGO` + QR

Posição: página + **topo / meio / rodapé** × **esquerda / centro / direita**
(não fica preso ao rodapé).

Ilustrativo + evidências IPECC — Lei 14.063/2020; não é ICP-Brasil.

- Rate limit por IP+usuário nas rotas `.../ipecc/*` e na validação pública `/api/public/validar/{codigo}` (além do cooldown OTP e `max_attempts` no banco).
- Auditoria admin: `/admin/documentos/auditoria` lista evidências IPECC com download de laudo (`.txt` / CSV).
- APIs: `GET /api/admin/documentos/evidencias` e `GET /api/admin/documentos/evidencias/[id]/laudo`.
- Checklist: `npm run validar:documentos`.
