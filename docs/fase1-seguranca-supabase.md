# Fase 1 — Segurança crítica (Supabase Dashboard)

Aplicar manualmente no Supabase. O código já exige sessão + `is_admin` para downloads do bucket `propostas`.

## 1. Bucket `propostas` — tornar privado

Storage → bucket `propostas` → desmarcar **Public bucket**.

Upload público em `app/propostas/page.tsx` continua via anon key + políticas de INSERT; leitura passa só por `/api/download` (service role após checagem admin).

## 2. Políticas de storage (exemplo)

Ajuste conforme seu modelo. Exemplo mínimo:

```sql
-- Leitura: negar anon/authenticated no bucket propostas (download só via API com service role)
-- INSERT: permitir upload anônimo apenas em paths controlados (se o fluxo público exigir)

-- Exemplo: remover policy pública de SELECT se existir
-- DROP POLICY IF EXISTS "Public read propostas" ON storage.objects;
```

## 3. RLS tabela `propostas`

Garantir que usuários anônimos não leiam linhas de outras propostas:

```sql
-- SELECT: apenas admins autenticados (via função is_admin)
-- INSERT: política específica para envio público (se aplicável)
-- UPDATE/DELETE: apenas admin
```

Revise políticas atuais no Dashboard antes de aplicar SQL cego.

## 4. Rotação de chaves (se `.env` já vazou)

- Rotacionar `SUPABASE_SERVICE_ROLE_KEY`
- Rotacionar `RESEND_API_KEY`
- Atualizar `.env.local` localmente (nunca commitar)

## 5. Testes pós-Dashboard

1. Envio público de proposta (upload) ainda funciona
2. `/admin/propostas/[id]` — download de anexo com admin logado
3. URL de download sem cookie → 401/403
4. `/api/download/.../docs/...` e editais públicos continuam acessíveis
