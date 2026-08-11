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

## FASE 0 — Segurança do banco `[CONCLUÍDA — aprovada e aplicada em 11/08/2026]`

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

> ### ⚠️ O `EXECUTE` está concedido a `PUBLIC` — revogar só dos papéis não tem efeito
>
> Inspeção do ACL das 9 funções (`pg_proc.proacl`) mostra o mesmo padrão em todas:
>
> ```
> =X/postgres | postgres=X/postgres | anon=X/postgres | authenticated=X/postgres | service_role=X/postgres
> ```
>
> O primeiro elemento, `=X/postgres`, é o **grant a `PUBLIC`** (grantee vazio = PUBLIC).
> Como `anon` e `authenticated` herdam de `PUBLIC`, um `REVOKE ... FROM anon` deixa o acesso
> intacto pela herança. **Todo `REVOKE` desta seção precisa incluir `public` na lista.**

#### Grupo A — revogar de `public`, `anon` e `authenticated`

Zero referências no código, ou acesso exclusivo por service role. Verifiquei também que nenhuma
política RLS e nenhum corpo de função referencia estas cinco — a revogação não quebra dependência interna.

```sql
revoke execute on function public.is_admin_perfil(p_user_id uuid)                     from public, anon, authenticated;
revoke execute on function public.certidoes_is_current_version(p_certidao_id uuid)    from public, anon, authenticated;
revoke execute on function public.atualizar_impacto_home(p_titulo text, p_texto text) from public, anon, authenticated;
revoke execute on function public.notify_new_proposta()                               from public, anon, authenticated;
revoke execute on function public.diagnostico_tabelas()                               from public, anon, authenticated;
revoke execute on function public.diagnostico_rls_status()                            from public, anon, authenticated;
```

- `diagnostico_tabelas` / `diagnostico_rls_status` — chamadas só em `app/api/admin/diagnostico/route.ts`, que usa `getSupabaseAdmin()`. Hoje **entregam o mapa do schema a quem não está logado**.
- `notify_new_proposta` é função de gatilho: dispara dentro do `INSERT`, não precisa de `EXECUTE` para papel nenhum.
- `certidoes_is_current_version` e `atualizar_impacto_home` — nenhuma referência no repositório.

#### Grupo B — revogar de `public` e `anon`, **preservar `authenticated`**

O navegador chama estas com a sessão do usuário logado. O `GRANT` explícito depois do `REVOKE` é
redundante (o grant nominal a `authenticated` sobrevive à revogação de `PUBLIC`), mas deixa a
intenção explícita e garante que ninguém seja trancado fora por engano:

```sql
revoke execute on function public.is_admin(user_id uuid)             from public, anon;
grant  execute on function public.is_admin(user_id uuid)             to   authenticated;

revoke execute on function public.is_admin_ou_perfil(p_user_id uuid) from public, anon;
grant  execute on function public.is_admin_ou_perfil(p_user_id uuid) to   authenticated;
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

## FASE 1 — Página pública de propostas `[CONCLUÍDA — commit dbe8755]`

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

## FASE 2 — Performance do banco `[PARCIAL — 3 de 5 itens aplicados e verificados]`

**Aprovação:** dono autorizou explicitamente ("faça vc mesmo") após inventário de leitura
apresentado sem nenhuma alteração prévia no banco. Cada item abaixo foi lido, verificado
e só então aplicado — nenhum lote cego.

### Aplicado e verificado

| Alerta | Antes | Depois | O que foi feito |
|---|---:|---:|---|
| `auth_rls_initplan` | 70 | **0** | As 70 políticas reescritas via bloco `DO` dinâmico, envolvendo `auth.uid()`/`auth.role()`/`auth.jwt()` em `(select ...)`. Reescrita mecânica — o texto de `qual`/`with_check` foi reaproveitado byte a byte, só embrulhado; conferido policy a policy antes de aplicar (nenhuma tinha wrapping parcial pré-existente, então não há risco de dupla-embrulhagem). Confirmado por linter oficial: 0 restantes. |
| `duplicate_index` | 1 (linter) / 4 reais | **0** | O linter reportava só 1, mas o inventário achou 4: três cópias soltas de um índice único em `paginas_conteudo` (mantido o que sustenta a constraint real) e um índice simples redundante com um índice único em `transparencia_editais` (mantido o único, que garante a regra de integridade). **Nenhuma tabela, coluna ou linha foi removida — só os índices duplicados.** Verificado antes de aplicar que nenhum dos removidos sustentava constraint. |
| `unindexed_foreign_keys` | 52 | **0** | Criado 1 índice por FK sem cobertura, via bloco `DO` dinâmico. Mudança puramente aditiva — não altera nenhuma política nem resultado de consulta. |

### Pendente — exige mais cautela, não é lote seguro

| Alerta | Qtd. atual | Por que não foi aplicado ainda |
|---|---:|---|
| `multiple_permissive_policies` | 71 | Consolidar políticas permissivas duplicadas exige ler a lógica de cada par e confirmar que o `OR` resultante preserva exatamente o mesmo acesso — diferente do fix de `auth_rls_initplan`, aqui hà risco real de juntar regras que deveriam ficar separadas. Inventário de leitura ainda não feito. |
| `unused_index` | 130 (subiu de 78 porque os 52 índices novos da FK começam com zero uso registrado, o que é esperado) | **Não tratar "sem uso registrado" como "pode remover".** Alertado explicitamente pelo dono: o banco tem poucos dias de tráfego real, então baixo uso é normal nesta fase do projeto, não sinal de abandono. Fica pendente até haver volume real de consultas para avaliar com dado de verdade — não com contagem de zero linhas. |

Incluir também a mitigação de `validar_portal_token` que ficou pendente da Fase 0: rate limiting
na rota do portal e revisão da entropia do token — ainda não feito.

### Verificação de segurança pós-Fase 2

Linter de segurança rodado de novo depois de cada aplicação: **0 ERROR, mesmos 5 WARN de antes**
(nenhum novo problema introduzido pelas reescritas de política ou pelos índices novos).

---

## FASE 3 — Paginação nas telas restantes `[CONCLUÍDA — commit 961ee60]`

**Esforço real:** ~1 dia. O audit original (grep por `.select()` sem `.range()`/`.limit()`) gerou
falsos positivos e itens de baixo valor — corrigidos abaixo depois de inspecionar cada página.

### Implementado

| Página | Padrão | Motivo |
|---|---|---|
| `app/admin/propostas/page.tsx` | Cliente, 12/página | Prioridade alta — cresce a cada envio público. |
| `app/admin/noticias/page.tsx` | Cliente, 12/página | Prioridade alta. `statsRow` também migrado de `<div onClick>` para `<button aria-pressed>` — mesmo problema já corrigido em `editais`, achado ao editar este bloco. |
| `app/admin/certidoes/page.tsx` | Cliente, 50/página — **paginação só no render, não no fetch** | `filtrarVersoesCorrentes()` precisa ver **todas** as certidões para decidir qual versão é a vigente. Paginar a busca com `.range()` faria uma certidão superada reaparecer como vigente se a sucessora caísse numa página seguinte. O fetch continua trazendo tudo; só a tabela renderiza em fatias. |
| `app/admin/paginas/contato/formulario/page.tsx` (`contato_mensagens`) | Cliente, 30/página | Única página da lista "baixa prioridade" que de fato cresce sem curadoria — todo envio do formulário público gera uma linha. |

### Correções ao escopo original (não implementadas — motivo verificado, não suposto)

- **`app/admin/editais/[id]/page.tsx` e `app/admin/propostas/[id]/page.tsx`** — são páginas de
  **registro único** (`.eq("id", id).single()`), não listas. O grep do audit original não distinguia
  `.select()` de lista de `.select()` de registro único. Paginação não se aplica.

- **`app/admin/portal/page.tsx` (`portal_tokens`) e `app/admin/transparencia/resultados/page.tsx`
  (`transparencia_editais`)** — confirmado por contagem real no banco: **0 linhas** em ambas,
  contra **3** em `editais`. São listas curadas manualmente pelo admin (um token por parceiro, um
  bloco de resultado por edital), crescem 1:1 com um processo lento e supervisionado — não com
  submissão externa. Adicionar paginação aqui seria abstração prematura.

- **`app/admin/paginas/editais/documentos`, `textos`, `mural`, `contato/canais`,
  `projetos/eixos`** — blocos de conteúdo de CMS escopados a uma página específica
  (`.eq("pagina_slug", ...)`), naturalmente pequenos pela própria natureza do dado. Mesma lógica
  do item acima.

Nenhuma dessas correções muda o padrão das convenções (seção 1) — só evita paginação onde os dados
não crescem sem teto.

---

## FASE 4 — Responsividade móvel do painel `[CONCLUÍDA — commit 268f99c]`

**Esforço real:** ~1 dia. O número de "36 páginas" do audit original contava qualquer
`gridTemplateColumns`, mas a maioria já usa `repeat(auto-fit/auto-fill, minmax(...))`,
que reflui sozinho sem precisar de nada. O problema real eram as ~19 grades de N
colunas **fixas** (`"1fr 1fr"`, `"280px 1fr"`, `"repeat(2, minmax(0,1fr))"`) que não
colapsam em tela estreita.

Solução: três classes utilitárias novas em `app/admin/globals.css` — `.admin-grid-2`,
`.admin-shell-split`/`--wide`, `.admin-table-grid-wrap` — ver seção 1 (Convenções)
para o padrão de uso. Aplicadas em `beneficiarios`, `lgpd`, `documentos/fluxos`,
`contato/formulario`, e nos 8 blocos de campo lado-a-lado de `transparencia`
(resultados/editais/prestação/convênios) e dos formulários de
destaques/cards/quem-somos. De caminho, 4 objetos de estilo `grid2` que nunca eram
referenciados em JSX foram removidos (código morto).

Verificação: `npm run build` limpo. Checagem via Playwright em viewport 375px na
única página sem exigência de login (`/propostas`, pública) confirma ausência de
scroll horizontal. Páginas admin autenticadas não puderam ser verificadas
visualmente por exigirem login nesta sessão — validadas por build + revisão do
CSS/media queries aplicados, não por clique real na interface.

**Esforço estimado original (referência, não mais válido):** 5–8 dias · **Semanas 6–7**.

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

## FASE 5 — Consolidação técnica `[CONCLUÍDA — commit 012c528]`

**Esforço real:** ~1 dia.

### 10 usos de `any` — todos resolvidos

| Local | Fix |
|---|---|
| `propostas/[id]/page.tsx:88` | `useState<any>` → `useState<Proposta \| null>`, tipo espelhando o já usado na listagem, com índice de assinatura para os campos que `usePropostaDocumental` (fora de escopo) ainda acessa sem tipo. |
| `AdminDashboardClient.tsx:1156` | `const styles: any` → `Record<string, React.CSSProperties>`. |
| `AdminDashboardClient.tsx:778` | `chartOptions as any` → `ChartOptions<"line">` do próprio `chart.js`, já importado no arquivo. |
| `contato/canais/page.tsx:87` | `card: any` → `Partial<Card>`. |
| `contato/canais/page.tsx:190` | `as any` → `as Item["tipo"]` (só 3 valores possíveis no `<select>`). |
| `projetos/eixos/page.tsx:54` | `updateEixo(campo, valor: any)` → genérico `<K extends keyof Eixo>(campo: K, valor: Eixo[K])`. |
| `transparencia/convenios/page.tsx` (4 ocorrências) | `catch (error: any)` → `catch (error: unknown)` com narrowing (padrão já usado em `app/propostas/page.tsx`). De caminho, corrigido um toast de sucesso disparado duas vezes em `salvarTodos()`, achado ao editar a mesma função. |

### `console.log` e `TODO/FIXME` — falsos positivos do audit original, nada a corrigir

- O único `console.log` está dentro de uma **string de exemplo de código** em `app/api-docs/page.tsx` (snippet mostrado ao desenvolvedor visitante da documentação da API) — não é uma chamada real.
- As 3 ocorrências de `TODO` eram a palavra "TODOS" dentro de mensagens de confirmação (`app/admin/documentos/lixeira/page.tsx`, 2x) e o comentário de seção `{/* METODOLOGIA */}` (`app/projetos/page.tsx`) — nenhuma é uma marcação real de pendência.

### Resto

- ✅ Estilo inline vs. classes CSS documentado na seção 1 deste arquivo.
- ✅ `CLAUDE.md` criado na raiz do repositório com as convenções, para ficar disponível a qualquer sessão futura sem depender de encontrar este documento.

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
