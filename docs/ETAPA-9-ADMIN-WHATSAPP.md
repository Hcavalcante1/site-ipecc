# Etapa 9 — Validar handoff em `/admin/whatsapp`

Checklist manual (após etapa 8 com Meta real ou teste local com `WHATSAPP_DRY_RUN=1`).

## Pré-requisitos

- [ ] `npm run dev` ativo
- [ ] Login admin funcionando
- [ ] `WHATSAPP_*` configurado (local ou sandbox Meta)

## Passos

1. Abrir `http://localhost:3000/admin/whatsapp`
2. Simular ou receber mensagem inbound (opção **6** no bot)
3. Confirmar na lista:
   - Estado **Aguardando equipe**
   - Log/tipo **HANDOFF** (conforme implementação)
4. Registrar no `docs/ENTERPRISE-STATUS.md`:
   - [ ] Handoff visível em `/admin/whatsapp`

## Validação automática já feita (código)

```bash
npm run validar:whatsapp-handoff-fase4
```

Evidência em `reports/whatsapp-handoff-fase4.txt`.

## Critério de OK

UI reflete o mesmo estado validado pelo script (handoff + idempotência).
