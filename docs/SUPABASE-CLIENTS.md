# Clientes Supabase — matriz canônica

Referência para Fase 2 do [ROADMAP-ENTERPRISE.md](./ROADMAP-ENTERPRISE.md). Migração arquivo a arquivo: [FASE-2-2-MIGRACAO-SUPABASE.md](./FASE-2-2-MIGRACAO-SUPABASE.md).

## Quando usar cada client

| Módulo | Arquivo | Ambiente | Uso |
|--------|---------|----------|-----|
| Browser (admin/login) | `lib/supabaseClient.ts` | Client Component / `"use client"` | **Padrão** para páginas admin e login |
| Server Components | `lib/supabaseServer.ts` → `createClient()` | Server (RSC) | Home, notícia detalhe, transparência, `lib/db.ts` |
| Service role | `lib/supabaseAdmin.ts` | **Somente** API routes, scripts, `lib/storage/*` | Bypass RLS; nunca no browser |
| Público anônimo | `lib/supabasePublic.ts` | Leitura pública sem sessão | Usar quando migrar páginas públicas |
| Legado | `lib/getSupabase.ts` | — | **Deprecar** → `supabaseServer` ou `supabasePublic` |
| Duplicata | `supabase/client.ts` | — | **Deprecar** após zerar imports |
| Legado | `lib/supabase-browser.ts` | — | Migrar → `supabaseClient` |

## Proibido em código novo

- `createClient(url, anonKey)` inline em páginas ou componentes.
- Service role (`SUPABASE_SERVICE_ROLE_KEY`) no browser ou em Client Components.

## Exceções aceitas (por enquanto)

| Arquivo | Motivo |
|---------|--------|
| `app/api/login/route.ts` | `createClient` no handler (sessão por request) |
| `scripts/auditar-anexos-propostas.ts` | Script CLI com service role local |
| `lib/logAction.ts` | Avaliar migrar para `supabaseAdmin` em API |

## Progresso Fase 2 (admin)

- **2.1 Propostas:** concluído (`app/admin/propostas/*`).
- **2.2 Demais módulos:** ver matriz em `FASE-2-2-MIGRACAO-SUPABASE.md` (~34 arquivos pendentes no admin).
