# Incidente — regressão de RLS por repositórios divergentes (2026-08-11)

Registro honesto de um erro cometido durante o hardening de RLS de hoje, achado e
corrigido na mesma sessão. Complementa `docs/DIAGNOSTICO-CRONOGRAMA-RLS-2026-08-11.md`
e `docs/PLANO-FINALIZACAO-SITE-2026-08-11.md`.

## O que aconteceu

Ao decidir se as 7 tabelas "órfãs" (`api_tokens`, `beneficiarios`, `org_membros`,
`organizacoes`, `portal_tokens`, `lgpd_consentimentos`, `lgpd_solicitacoes`) eram
seguras de travar em `is_admin()`, busquei consumidores dessas tabelas só no
repositório `ipecc-whatsapp-leads` (onde eu estava trabalhando) e encontrei zero
resultados — conclusão: "nenhuma tem feature construída, seguro apertar".

Essa conclusão estava **errada**. O deploy real de produção (confirmado no
dashboard do Vercel, projeto `site-ipecc`) não é alimentado por
`ipecc-whatsapp-leads` — é alimentado por um repositório separado,
**`Hcavalcante1/site-ipecc`**, documentado como "espelho" em vários docs antigos
(`PUSH-PACKAGE-LOCAL.md`, `RELATORIO-DEMANDA-PUBLICACAO-DIGITAL.md`: *"Deploy
Vercel vem do remote `site-ipecc`"*) mas que na prática divergiu bastante e tem
uma feature completa de multi-tenant (organizações, membros, convites, billing,
portal do financiador) que não existe em `ipecc-whatsapp-leads`.

Resultado: a migration `rls-gate-orphan-tables-2026-08-11-APLICAR.sql` (aplicada
mais cedo hoje) travou `organizacoes`, `org_membros` e `convites_org` em
`is_admin()` apenas — e quebrou, em produção:

1. **`/org/[slug]`** (página pública) — parou de retornar dados (a página lê
   `organizacoes` via cliente anônimo, `site-ipecc/app/org/[slug]/page.tsx`).
2. **Contexto de organização de qualquer usuário logado** — `useOrgContexto()`
   (`site-ipecc/lib/auth/useOrgContexto.ts`) lê `org_membros`/`organizacoes` pra
   descobrir a própria org do usuário, não só admin.
3. **`/convite/[token]`** (aceitar convite de organização) — parou de conseguir
   ler o convite pelo token (`site-ipecc/app/convite/[token]/page.tsx`).

`api_tokens`, `beneficiarios`, `portal_tokens` e as duas tabelas de LGPD
**não** apresentaram esse problema — são usadas só em telas `/admin/*` sem sinal
de acesso não-admin, então `is_admin()` parece ser o modelo correto pra elas.

## Como foi descoberto

O usuário mandou um print do dashboard do Vercel mostrando o histórico de deploys
do projeto `site-ipecc` — os commits ali (refactor de UI, "Fase 0-5 de auditoria
técnica", features de multi-tenant) não batiam com nada do que eu tinha visto em
`ipecc-whatsapp-leads`. Isso levou a adicionar o repositório `site-ipecc` à sessão
e investigar antes de presumir que "deploy = sucesso" (o que eu tinha afirmado
incorretamente pouco antes).

## Correção aplicada

`docs/sql/rls-hotfix-organizacoes-convites-2026-08-11.sql`, aplicado direto no
Supabase (mesmo banco, único projeto — ver `PLANO-FINALIZACAO-SITE-2026-08-11.md`):

- `organizacoes`: repõe `SELECT` público para `ativo = true` (mesmo filtro que o
  código de `site-ipecc` já usa).
- `org_membros`: repõe `SELECT` para o próprio usuário (`user_id = auth.uid()`).
- `convites_org`: **reversão temporária** para `qual = true` (mesmo estado de
  antes de hoje) — não dá pra restringir "select por token" com RLS declarativo
  sem o valor do token estar disponível pra policy (PostgREST não expõe o filtro
  da query pra dentro da policy). Fica como risco aceito temporariamente até uma
  correção própria.

## Pendência real — fora do alcance desta sessão

**`convites_org` continua com `SELECT` aberto** (`qual = true`) — qualquer pessoa
não autenticada pode listar todos os convites pendentes de organização, incluindo
o token. Isso é o mesmo problema identificado na seção 1.2 do diagnóstico original
de hoje, reaberto de propósito para não deixar a página de aceitar convite fora
do ar.

**Correção definitiva** (não feita — exige mudança de código em `site-ipecc`, e
esta sessão só tem acesso de leitura a esse repositório):

1. Criar `validar_convite_token(p_token text)` como função `SECURITY DEFINER`
   (mesmo padrão já usado em `validar_portal_token`), retornando só os campos
   públicos do convite que bate com o token exato.
2. Trocar `site-ipecc/app/convite/[token]/page.tsx` para chamar essa RPC em vez
   de `.from("convites_org").select(...).eq("token", token)` diretamente.
3. Só depois disso, remover a policy `convites_org_select_temp_aberto`.

## Lição para o que vier depois

Antes de qualquer decisão de RLS baseada em "não tem consumidor no código",
**confirmar primeiro em qual repositório o Vercel realmente faz deploy** —
verificado hoje via `docs/RELATORIO-DEMANDA-PUBLICACAO-DIGITAL.md`: é
`Hcavalcante1/site-ipecc`, não `Hcavalcante1/ipecc-whatsapp-leads`. Os dois
repositórios divergiram significativamente (histórico de commits completamente
diferente a partir de um certo ponto) e isso é, por si só, um problema estrutural
maior que vale a pena a equipe resolver — não é algo que esta sessão deveria
tentar reconciliar sozinha.
