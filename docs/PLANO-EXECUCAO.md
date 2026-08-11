# Plano de Execução — Auditoria IPECC

> **Documento de handoff.** Escrito para um agente que começa sem contexto prévio.
> Auditoria executada em 11/08/2026 sobre o commit `d2b0aba` (branch `main`).
> Projeto Supabase: `eohshxaxbsdpxundsley` (ACTIVE_HEALTHY, us-west-2).

---

## 0. Antes de qualquer coisa — leia isto

### Regra de aprovação (inegociável)

O dono do projeto declarou explicitamente:

> *"Só não esqueça de que eu é quem aprovo essas mudanças"*
> *"quero receber email real no zoho, não invente nada sem a minha permissão, sem jeitinho"*

Consequências práticas:

- **Nenhuma alteração no banco de produção sem "pode aplicar" explícito dele.** Toda a Fase 0 está bloqueada por isso. O SQL está pronto abaixo — não execute por conta própria.
- **Nunca criar infraestrutura de e-mail** (Zoho ou qualquer outra), domínio, conta ou serviço externo sem permissão explícita.
- Alterações de código no repositório seguem o fluxo normal de commit/push.

### Ambiente

| Item | Valor |
|---|---|
| Repositório | `/workspace/site-ipecc` |
| Remote | `https://github.com/hcavalcante1/site-ipecc` |
| Branch de trabalho | `main` (push dispara deploy automático na Vercel) |
| Stack | Next.js 14 App Router, TypeScript, Supabase |
| Checagem de tipos | `node --max-old-space-size=512 node_modules/.bin/tsc --noEmit -p tsconfig.json` |

O flag `--max-old-space-size=512` é necessário — sem ele o `tsc` estoura memória neste ambiente.

**Estado atual: `tsc` retorna 0 erros. Mantenha assim — é o critério mínimo de qualquer entrega.**

---

## 1. Convenções do código (siga, não invente)

Estas convenções já estão aplicadas em todo o painel. Código novo que fugir delas será inconsistente.

### Notificações

```ts
import { triggerToast } from "@/components/AdminToast";

triggerToast("Edital salvo.", "success");
triggerToast("Erro ao salvar.", "error");
```

**Só existem dois tipos: `"success"` e `"error"`.** Não há `"warning"`, `"info"` nem variantes. Passar
outra string quebra a tipagem.

### Confirmação de ação destrutiva

Padrão obrigatório, com fallback quando o modal ainda não montou:

```ts
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";

const ok = await confirmAction("Remover este registro?");
if (!ok) {
  if (!isConfirmModalReady() && !window.confirm("Remover este registro?")) return;
  else if (isConfirmModalReady()) return;
}
```

Os 32 pontos de ação destrutiva do painel já usam exatamente isso. **Nunca use `window.confirm` ou
`alert()` como caminho primário.**

### Estilo

- **Padrão principal:** estilos inline via objeto `React.CSSProperties` (`const s: Record<string, CSSProperties> = {…}`).
- **Padrão legado:** classes CSS (`admin-h1`, `admin-card`, `admin-button`, `admin-subtitle`) em páginas mais antigas.
- Ao editar uma página, **mantenha o padrão que ela já usa.** Não converta de um para outro sem necessidade.

### Cartões de filtro (`statsRow`)

Contadores clicáveis que filtram a lista. Devem ser `<button>` com `aria-pressed`, nunca `<div onClick>`:

```tsx
<button type="button" aria-pressed={filtro === card.key} onClick={() => setFiltro(...)}>
  <span>{card.value}</span>
  <span>{card.label}</span>
</button>
```

Referência boa: `app/admin/certidoes/page.tsx` e `app/admin/editais/page.tsx`.

### Paginação

Dois padrões válidos:

- **Servidor** (preferir quando o volume cresce sem teto) — `app/admin/beneficiarios/page.tsx`:
  `const POR_PAGINA = 50` + `.range(offset, offset + POR_PAGINA - 1)` + `carregarMais()`.
- **Cliente** (aceitável quando os dados já vêm todos por outro motivo) — `app/admin/editais/page.tsx`:
  `slice(0, (pagina + 1) * POR_PAGINA)` + botão "Carregar mais". **Filtro e busca devem resetar a página para 0.**

### Subpáginas de Gestão Documental

Tudo sob `app/admin/documentos/*` usa o wrapper `GestaoDocumentalShell`, importado de
`../components/GestaoDocumentalShell` (também exporta `gdBtnStyle`, `gdCardStyle`, `gdInputStyle`).

---

## FASE 0 — Segurança do banco `[BLOQUEADA — aguarda aprovação]`

**Esforço:** 1 dia · **Semana 1** · **Não execute sem o "ok" explícito do dono.**

Origem: linter oficial do Supabase + confirmação por consulta direta ao catálogo do Postgres.

### 0.1 `rate_limits` aceita escrita anônima `[ERRO — único achado crítico]`

Estado confirmado por query direta:

```
tabela      | rls_ativo | politicas | anon_le | anon_escreve | linhas
rate_limits |   false   |     0     |  true   |    true      |   8
```

Colunas: `key text`, `count integer`, `reset_at timestamptz`.

**Impacto:** a tabela sustenta o rate limiting de assinatura, OTP e validação pública. Com escrita
anônima liberada, qualquer visitante pode zerar o próprio contador e neutralizar a proteção, ou
inserir contadores falsos em nome de terceiros.

**Por que o fix é seguro** — verifiquei todos os chamadores. O único é
`lib/documentos/signing/rateLimit.ts:26`, que usa `getSupabaseAdmin()` (service role). **O service
role ignora RLS**, então ativar RLS sem política nenhuma não quebra nada.

```sql
alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;
```

Não crie política. RLS ativo + zero políticas = ninguém acessa via API pública, service role continua
funcionando. Depois disso a tabela passa a aparecer como `rls_enabled_no_policy` (INFO) — que é o
estado correto e seguro.

### 0.2 Funções `SECURITY DEFINER` expostas — **revogação seletiva**

⚠️ **Não revogue as 9 funções em bloco.** Rastreei chamador por chamador; três grupos com tratamento
diferente. Revogar tudo derruba o painel e o portal do financiador.

#### Grupo A — revogar de `anon` **e** `authenticated`

Zero referências no código, ou acesso exclusivo por service role:

```sql
revoke execute on function public.is_admin_perfil(p_user_id uuid)                    from anon, authenticated;
revoke execute on function public.certidoes_is_current_version(p_certidao_id uuid)   from anon, authenticated;
revoke execute on function public.atualizar_impacto_home(p_titulo text, p_texto text) from anon, authenticated;
revoke execute on function public.notify_new_proposta()                              from anon, authenticated;
revoke execute on function public.diagnostico_tabelas()                              from anon, authenticated;
revoke execute on function public.diagnostico_rls_status()                           from anon, authenticated;
```

- `diagnostico_tabelas` / `diagnostico_rls_status` — chamadas só em `app/api/admin/diagnostico/route.ts`, que usa `getSupabaseAdmin()`. Hoje **entregam o mapa do schema a quem não está logado**.
- `notify_new_proposta` é função de gatilho: dispara dentro do `INSERT`, não precisa de `EXECUTE` para papel nenhum.
- `certidoes_is_current_version` e `atualizar_impacto_home` — nenhuma referência no repositório.

#### Grupo B — revogar **só** de `anon`, preservar `authenticated`

O navegador chama estas com a sessão do usuário logado:

```sql
revoke execute on function public.is_admin(user_id uuid)             from anon;
revoke execute on function public.is_admin_ou_perfil(p_user_id uuid) from anon;
```

Chamadores no browser (client `@/lib/supabaseClient`, papel `authenticated`):
- `app/admin/AdminShellClient.tsx:135` (`is_admin_ou_perfil`) e `:140` (`is_admin`)
- `lib/auth/useAdminEscopoCliente.ts:30` (`is_admin`)

**Revogar de `authenticated` tranca todos os administradores fora do painel.**

#### Grupo C — **não revogar**

```
public.validar_portal_token(p_token text)   -- MANTER acesso anon
```

`app/portal/[token]/page.tsx:36` chama esta função com `supabasePublic` — **a chave anônima**. É o
portal do financiador, acessado por link com token, sem login. Revogar do `anon` derruba o portal.

> **Correção a um ponto do relatório de auditoria:** a versão em artifact sugeriu que
> `validar_portal_token` poderia ser revogada do anônimo. Está errado — ela depende do acesso anônimo
> por design. O risco de teste de tokens em massa é real, mas a mitigação correta é rate limiting e
> entropia do token, **não** revogação. Trate isso na Fase 2, não aqui.

### 0.3 `search_path` mutável — 10 funções

As duas primeiras são `SECURITY DEFINER` **sem** `search_path` fixo — a combinação genuinamente
perigosa, porque permite induzir a função a resolver um objeto malicioso com privilégio elevado.
As demais são gatilhos, risco menor, mas o fix é o mesmo.

```sql
alter function public.atualizar_impacto_home(p_titulo text, p_texto text)              set search_path = public, pg_temp;
alter function public.notify_new_proposta()                                            set search_path = public, pg_temp;
alter function public.atualizar_updated_at()                                           set search_path = public, pg_temp;
alter function public.check_rate_limit(p_key text, p_window_ms bigint, p_max integer)  set search_path = public, pg_temp;
alter function public.gd_adv_forbid_mutate()                                           set search_path = public, pg_temp;
alter function public.gd_cert_forbid_mutate()                                          set search_path = public, pg_temp;
alter function public.set_current_timestamp_updated_at()                               set search_path = public, pg_temp;
alter function public.set_updated_at()                                                 set search_path = public, pg_temp;
alter function public.set_updated_at_proposta_anexos()                                 set search_path = public, pg_temp;
alter function public.set_updated_at_transparencia_convenios()                         set search_path = public, pg_temp;
```

As outras funções `SECURITY DEFINER` (`is_admin`, `is_admin_ou_perfil`, `is_admin_perfil`,
`diagnostico_*`, `validar_portal_token`, `certidoes_is_current_version`) **já têm `search_path=public`**
e não aparecem nesta lista. Não mexa nelas.

### 0.4 Proteção contra senhas vazadas

Toggle no painel do Supabase (Auth → Policies), sem código. Ativa a checagem contra HaveIBeenPwned.

### Critério de conclusão da Fase 0

Rodar o linter de segurança e confirmar:
- **0** achados nível `ERROR`
- **0** achados `anon_security_definer_function_executable` (exceto `validar_portal_token`, que é intencional)
- **0** achados `function_search_path_mutable`

---

## FASE 1 — Página pública de propostas

**Esforço:** 2–3 dias · **Semanas 1–2** · Sem dependência da Fase 0, pode começar em paralelo.

Todo o painel administrativo foi migrado para `triggerToast`/`confirmAction`. A página
`/propostas` — **a única desta lista voltada ao cidadão** — ficou de fora e ainda dispara caixas
nativas do navegador.

**Arquivo:** `app/propostas/page.tsx`
**Ocorrências de `alert()`:** linhas `808, 840, 846, 854, 861, 877, 972, 980`

Tarefas:

1. Substituir os 8 `alert()` por **validação inline junto ao campo** (mensagem abaixo do input), mais
   `triggerToast` para o resultado final do envio.
   - Linhas 840/854 são validação de campo obrigatório → inline.
   - Linha 972 é sucesso de envio → `triggerToast(..., "success")`.
   - Linha 980 é erro de envio → `triggerToast(msg, "error")`.
2. Marcar campos inválidos com `aria-invalid={true}` e mover o foco para o primeiro erro.
3. Desabilitar o botão durante o envio, com rótulo de estado (`"Enviando…"`), para impedir que duplo
   clique gere proposta duplicada.

**Verificação:** `grep -n "alert(" app/propostas/page.tsx` retorna vazio.

---

## FASE 2 — Performance do banco

**Esforço:** 4–5 dias · **Semanas 3–4** · Depende da Fase 0 concluída.

273 alertas no linter de performance, 142 relevantes. Nenhum quebra o sistema hoje — todos degradam
de forma não-linear conforme as tabelas crescem.

| Alerta | Qtd. | Ação |
|---|---:|---|
| `auth_rls_initplan` | 70 | Envolver `auth.uid()` em `(select auth.uid())` nas políticas. Sem isso a função reavalia **por linha**. **Maior ganho isolado de toda a auditoria.** |
| `multiple_permissive_policies` | 71 | Consolidar políticas permissivas sobrepostas por tabela + ação. |
| `unindexed_foreign_keys` | 52 | Criar índices de cobertura nas FKs. |
| `unused_index` | 79 | **Revisar antes de remover** — algumas servem rotas ainda pouco acessadas. |
| `duplicate_index` | 1 | Remoção direta e segura. |

Ordem recomendada: `auth_rls_initplan` → `multiple_permissive_policies` → FKs → índices.

Incluir aqui também a mitigação de `validar_portal_token` que ficou pendente da Fase 0: rate limiting
na rota do portal e revisão da entropia do token.

---

## FASE 3 — Paginação nas telas restantes

**Esforço:** 3–4 dias · **Semanas 4–5**

14 das 28 telas com acesso a dados fazem `.select()` sem `range` nem `limit`. Aplicar o padrão já
validado em `beneficiarios` (servidor) ou `editais` (cliente) — ver seção de convenções.

**Prioridade alta** (crescimento sem teto):
```
app/admin/propostas/page.tsx
app/admin/noticias/page.tsx
```

**Prioridade média:**
```
app/admin/certidoes/page.tsx
app/admin/portal/page.tsx
app/admin/transparencia/resultados/page.tsx
app/admin/editais/[id]/page.tsx
app/admin/propostas/[id]/page.tsx
```

**Prioridade baixa** (volume naturalmente limitado, telas de CMS):
```
app/admin/paginas/editais/documentos/page.tsx
app/admin/paginas/editais/textos/page.tsx
app/admin/paginas/editais/mural/page.tsx
app/admin/paginas/contato/formulario/page.tsx
app/admin/paginas/contato/canais/page.tsx
app/admin/paginas/projetos/eixos/page.tsx
app/admin/paginas/transparencia/editais/page.tsx
```

Nota sobre `propostas`: já tem filtro client-side (`exibidas`), busca com debounce e `statsRow`.
Falta só o corte de paginação — não reescreva o resto.

---

## FASE 4 — Responsividade móvel do painel

**Esforço:** 5–8 dias · **Semanas 6–7** · Fase mais longa, toca 36 páginas.

Estado atual: **uma única** `@media query` em `app/admin/globals.css`. 36 páginas constroem layout
com medidas fixas inline (`maxWidth: 1100`, `minWidth`, `minmax()` rígido).

**O que já está pronto — não refaça:** a navegação já tem tratamento móvel completo em
`app/admin/AdminShellClient.tsx` (cabeçalho móvel, backdrop, `handleMobileNav`, breakpoint em 900px).
O que falta é o **conteúdo dentro do shell**, não o menu.

**Tabelas também já estão corretas:** 8 arquivos aplicam `overflowX` para as 7 tabelas existentes.

Tarefas:

1. Definir tokens de breakpoint em `app/admin/globals.css` + classes utilitárias de grade fluida.
2. Converter `gridTemplateColumns` fixos e `maxWidth` em medidas relativas, começando pelas telas de
   maior uso (`propostas`, `editais`, `beneficiarios`, `documentos/*`).
3. Revisar formulários longos em 360px de largura: `editais`, `certidoes/nova`, `propostas`.
4. Confirmar que nenhuma tabela gera rolagem horizontal **na página** (só dentro do próprio contêiner).

---

## FASE 5 — Consolidação técnica

**Esforço:** 2–3 dias · **Semana 8**

### 10 usos de `any` restantes

```
app/admin/propostas/[id]/page.tsx:88          useState<any>(null)          ← maior prioridade
app/admin/AdminDashboardClient.tsx:1156       const styles: any
app/admin/AdminDashboardClient.tsx:778        chartOptions as any
app/admin/paginas/contato/canais/page.tsx:87  dbCards.map((card: any)
app/admin/paginas/contato/canais/page.tsx:190 e.target.value as any
app/admin/paginas/projetos/eixos/page.tsx:54  valor: any
app/admin/paginas/transparencia/convenios/page.tsx:311,362,392,424   catch (error: any)
```

Os quatro `catch (error: any)` são o caso mais benigno — trocar por `catch (error: unknown)` com
narrowing. `propostas/[id]:88` é o mais relevante: mantém o registro inteiro sem tipo.

### Resto

- 1 `console.log` a remover.
- 3 marcações `TODO/FIXME` a resolver.
- Documentar a escolha entre estilo inline e classes CSS (hoje misturada entre páginas novas e antigas).
- Registrar em `CLAUDE.md` as convenções da seção 1 deste documento.

---

## Fora de escopo (evoluções, não correções)

Nenhum destes resolve problema existente. Só fazem sentido depois das 6 fases.

| Evolução | Quando |
|---|---|
| SWR / React Query | Depois da Fase 2. Cache antes de otimizar as consultas só mascara o problema. |
| Realtime Supabase | Quando houver operação simultânea real de várias pessoas no mesmo módulo. Hoje o botão "Atualizar" resolve. |
| Dashboard analítico | Depois da Fase 2 — relatórios agregados sobre índices ausentes seriam lentos por construção. |
| Padronização visual completa | Junto da Fase 4, aproveitando que ela já obriga a tocar as mesmas 36 páginas. |

---

## Definition of done (toda fase)

1. `node --max-old-space-size=512 node_modules/.bin/tsc --noEmit -p tsconfig.json` → **0 erros**.
2. Convenções da seção 1 respeitadas.
3. Commit descritivo em `main`, push com `git push -u origin main`.
   Em falha de rede, retry com backoff 2s / 4s / 8s / 16s.
4. Fases que tocam o banco: **aprovação explícita do dono registrada antes de aplicar**.

---

## Anexo — Números da auditoria

Apurados em 11/08/2026, commit `d2b0aba`.

**Superfície:** 107 páginas admin · 26 páginas públicas · 108 rotas de API · 44 componentes · 37.342 linhas no admin.

**Código:**

| Métrica | Valor |
|---|---:|
| Erros TypeScript | 0 |
| `alert()` nativos | 8 (todos em `app/propostas/page.tsx`) |
| `window.confirm` | 32 — **todos** no padrão correto de fallback |
| `any` explícitos | 10 |
| `console.log` | 1 |
| `TODO/FIXME` | 3 |
| Telas sem paginação | 14 de 28 |
| `@media queries` no admin | 1 |

**Banco — segurança:** 79 achados → 1 ERROR, 29 WARN, 49 INFO.

**Banco — performance:** 273 achados → 142 WARN, 131 INFO.

### Já entregue (commit `d2b0aba`, não refazer)

- `components/AdminErrorBoundary.tsx` — captura erro de render nas 107 páginas via `AdminShellClient`, com ação de retry.
- `app/admin/editais/page.tsx` — tipo `Edital` no lugar de `useState<any[]>` e `(e: any)`; `statsRow` migrado de `<div onClick>` para `<button aria-pressed>`; paginação de 10 em 10 com "Carregar mais".
