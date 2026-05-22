# Fase 2.2 — Migração para `supabaseClient` (matriz arquivo a arquivo)

**Objetivo:** substituir `createClient` inline por `import { supabase } from "@/lib/supabaseClient"` em Client Components admin.

**Padrão de diff (mínimo):**

```diff
-import { createClient } from "@supabase/supabase-js";
-const supabase = createClient(
-  process.env.NEXT_PUBLIC_SUPABASE_URL!,
-  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
-);
+import { supabase } from "@/lib/supabaseClient";
```

**Páginas com import dinâmico:** trocar bloco dinâmico pelo mesmo `supabase` no topo do arquivo (se `"use client"`).

**Ordem sugerida de PRs:** 1 Editais → 2 Transparência → 3 Projetos → 4 Quem-somos → 5 Contato → 6 Lib/Services.

Legenda: ✅ canônico · ⏳ pendente · 🔒 requer autorização · ⚙️ manter (server/admin API).

---

## Já migrado (Fase 2.1)

| Arquivo | Client |
|---------|--------|
| `app/admin/propostas/page.tsx` | ✅ `supabaseClient` |
| `app/admin/propostas/[id]/page.tsx` | ✅ `supabaseClient` |

---

## Admin — já em `supabaseClient` (não mexer na 2.2)

| Arquivo |
|---------|
| `app/admin/layout.tsx` |
| `app/admin/page.tsx` |
| `app/admin/AdminDashboardClient.tsx` |
| `app/admin/dashboard/page.tsx` |
| `app/admin/components/LogoutButton.tsx` |
| `app/admin/logs/page.tsx` |
| `app/admin/noticias/page.tsx` |
| `app/admin/noticias/form/EventoFormClient.tsx` |
| `app/admin/eventos/page.tsx` |
| `app/admin/eventos/form/NoticiaFormClient.tsx` |
| `app/admin/certidoes/page.tsx` |
| `app/admin/certidoes/nova/page.tsx` |
| `app/admin/editais/documentos/page.tsx` |
| `app/admin/paginas/editais/mural/page.tsx` |
| `app/admin/paginas/hero/page.tsx` |
| `app/admin/paginas/cards/page.tsx` |
| `app/admin/paginas/destaques/page.tsx` |
| `app/admin/paginas/depoimentos/page.tsx` |
| `app/admin/paginas/numeros/page.tsx` |
| `app/admin/paginas/impacto/page.tsx` |
| `app/admin/paginas/sobre-cta/page.tsx` |
| `app/admin/paginas/contato/formulario/page.tsx` |
| `app/admin/paginas/contato/endereco/page.tsx` |
| `app/admin/paginas/contato/cta/page.tsx` |
| `app/admin/paginas/transparencia/prestacao/page.tsx` |

---

## PR 1 — Editais (`app/admin/editais` + `app/admin/paginas/editais`) ✅

| Arquivo | Tipo | Status |
|---------|------|--------|
| `app/admin/editais/mural/page.tsx` | top-level inline | ✅ |
| `app/admin/editais/hero/page.tsx` | top-level inline | ✅ |
| `app/admin/editais/textos/page.tsx` | top-level inline | ✅ |
| `app/admin/editais/textos/hero/page.tsx` | top-level inline | ✅ |
| `app/admin/editais/textos/nova-secao/page.tsx` | top-level inline | ✅ |
| `app/admin/paginas/editais/hero/page.tsx` | top-level inline | ✅ |
| `app/admin/paginas/editais/cta/page.tsx` | top-level inline | ✅ |
| `app/admin/paginas/editais/textos/page.tsx` | top-level inline | ✅ |
| `app/admin/paginas/editais/textos/hero/page.tsx` | top-level inline | ✅ |
| `app/admin/paginas/editais/textos/nova-secao/page.tsx` | top-level inline | ✅ |
| `app/admin/paginas/editais/[id]/page.tsx` | top-level inline | ✅ |

---

## PR 2 — Transparência admin

| Arquivo | Tipo | Status |
|---------|------|--------|
| `app/admin/paginas/transparencia/hero/page.tsx` | top-level inline | ⏳ |
| `app/admin/paginas/transparencia/cta/page.tsx` | top-level inline | ⏳ |
| `app/admin/paginas/transparencia/documentos/page.tsx` | top-level inline | ⏳ |
| `app/admin/paginas/transparencia/compromissos/page.tsx` | top-level inline | ⏳ |
| `app/admin/paginas/transparencia/lgpd/page.tsx` | top-level inline | ⏳ |
| `app/admin/paginas/transparencia/editais/page.tsx` | top-level inline | ⏳ |
| `app/admin/paginas/transparencia/convenios/conveniosService.ts` | service module | ⏳ |
| `app/admin/transparencia/resultados/page.tsx` | top-level inline | ⏳ |

---

## PR 3 — Projetos admin

| Arquivo | Tipo | Status |
|---------|------|--------|
| `app/admin/paginas/projetos/hero/page.tsx` | top-level inline | ⏳ |
| `app/admin/paginas/projetos/introducao/page.tsx` | top-level inline | ⏳ |
| `app/admin/paginas/projetos/eixos/page.tsx` | top-level inline | ⏳ |
| `app/admin/paginas/projetos/destaques/page.tsx` | inline em handler | ⏳ |
| `app/admin/paginas/projetos/metodologia/page.tsx` | dynamic import | ⏳ |
| `app/admin/paginas/projetos/numeros/page.tsx` | dynamic import | ⏳ |
| `app/admin/paginas/projetos/cta/page.tsx` | dynamic import | ⏳ |

---

## PR 4 — Quem somos admin

| Arquivo | Tipo | Status |
|---------|------|--------|
| `app/admin/paginas/quem-somos/hero/page.tsx` | dynamic (×2) | ⏳ |
| `app/admin/paginas/quem-somos/mvv/page.tsx` | dynamic (×2) | ⏳ |
| `app/admin/paginas/quem-somos/bloco-principal/page.tsx` | dynamic (×2) | ⏳ |
| `app/admin/paginas/quem-somos/atuacao/page.tsx` | top-level inline | ⏳ |
| `app/admin/paginas/quem-somos/cta/page.tsx` | top-level inline | ⏳ |

---

## PR 5 — Contato admin

| Arquivo | Tipo | Status |
|---------|------|--------|
| `app/admin/paginas/contato/hero/page.tsx` | top-level inline | ⏳ |
| `app/admin/paginas/contato/canais/page.tsx` | top-level inline | ⏳ |
| `app/admin/paginas/contato/protocolos/page.tsx` | top-level inline | ⏳ |

---

## PR 6 — Lib / services (após admin UI)

| Arquivo | Ação | Status |
|---------|------|--------|
| `lib/logAction.ts` | Avaliar `supabaseAdmin` + chamada só server-side | ⏳ |
| `lib/homeData.ts` | `getSupabase()` → `supabaseServer` ou `supabasePublic` | ⏳ |
| `services/prestacaoContasService.ts` | `supabaseClient` ou server | ⏳ |
| `lib/getSupabase.ts` | Remover quando sem refs | ⏳ |
| `supabase/client.ts` | Remover quando sem refs | ⏳ |

---

## Fora da Fase 2.2 (outras fases / autorização)

| Arquivo | Client atual | Fase |
|---------|--------------|------|
| `app/propostas/page.tsx` | inline anon | 🔒 Fase 2.3 público |
| `app/editais/page.tsx` | inline | Fase 2.3 / `supabasePublic` |
| `app/editais/[id]/page.tsx` | inline | idem |
| `app/quem-somos/page.tsx` | inline | idem |
| `app/projetos/page.tsx` | inline | idem |
| `app/page.tsx` | `supabaseServer` | ✅ correto (RSC) |
| `app/noticias/[id]/page.tsx` | `supabaseServer` | ✅ |
| `app/transparencia/page.tsx` | `supabaseServer` | ✅ |
| `app/api/login/route.ts` | inline no handler | ⚙️ exceção |
| `app/api/download/*` | `supabaseAdmin` | ⚙️ |
| `app/api/admin/propostas/*` | `supabaseAdmin` | ⚙️ |
| `scripts/auditar-anexos-propostas.ts` | CLI service role | ⚙️ |

---

## Contagem

| Escopo | ✅ | ⏳ |
|--------|----|----|
| Admin propostas (2.1) | 2 | 0 |
| Admin já canônico | 24 | 0 |
| Admin Fase 2.2 PR1 editais | 11 | 0 |
| Admin Fase 2.2 PR2–6 | 0 | 23 |
| **Total admin browser** | **37** | **23** (~62% migrado) |

---

## Checklist por PR

- [ ] `npx tsc --noEmit`
- [ ] Smoke: login → módulo alterado → listar/salvar um registro
- [ ] Commit único por PR (`refactor(admin): supabaseClient em editais`, etc.)
- [ ] Não alterar layout visual nem middleware
