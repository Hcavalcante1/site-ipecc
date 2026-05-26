# Pré-cadastro WhatsApp — persistência (futuro)

**Status atual:** o site público **não grava** leads no banco. Após validação no painel, o usuário abre `wa.me` com mensagem formatada (`buildWhatsAppUrlFromLead`).

## O que já existe

| Peça | Caminho |
|------|---------|
| Formulário | `components/public/WhatsAppLeadForm.tsx` |
| Painel | `components/public/WhatsAppFloatingChat.tsx` |
| Mensagem / URL | `lib/whatsapp/publicWhatsApp.ts` |
| Validação | `npm run validar:whatsapp-public-chat` |
| Páginas | `npm run validar:whatsapp-public-pages` |
| Gate código | `npm run validar:push-prep` (inclui scripts acima) |

## Quando autorizar persistência

1. Aplicar SQL manual no Dashboard: `docs/sql/whatsapp-leads-staging.sql`
2. Definir env (exemplo staging, **não commitar**):

   ```env
   WHATSAPP_LEADS_PERSIST_SUPABASE=1
   ```

3. Implementar (PR separado):
   - `POST /api/public/whatsapp-lead` — valida payload, `insert` com `supabaseAdmin`, rate limit
   - Chamada no `handleSubmit` do `WhatsAppLeadForm` **antes** de `window.open(wa.me)`
   - Painel admin opcional: listagem em `/admin/whatsapp/leads`

4. **Não** misturar com `whatsapp_conversations` (bot Cloud API) — tabelas e fluxos distintos.

## Campos sugeridos

Alinhados ao formulário atual:

- `nome`, `organizacao`, `telefone`, `email`, `assunto`, `mensagem`
- `pagina_origem` — `window.location.pathname` no submit
- `created_at` — default no banco

## Regras

- Sem deploy / produção até checklist em `docs/PUSH-PACKAGE-LOCAL.md`
- Sem token Meta no frontend
- RLS: anon não deve ter INSERT direto na tabela

## Teste manual hoje (sem banco)

```bash
npm run dev
```

1. `/projetas` → menu WhatsApp → preencher → Continuar
2. Conferir URL `wa.me` com bloco de texto do IPECC
3. Repetir em `/editais`, `/propostas`, `/transparencia`
