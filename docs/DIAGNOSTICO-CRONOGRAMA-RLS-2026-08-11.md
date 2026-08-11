# Diagnóstico e cronograma — hardening RLS Supabase (2026-08-11)

Complementa `docs/DIAGNOSTICO-VALIDACAO-PLATAFORMA-2026-08-11.md` (diagnóstico original
de hoje) com o estado final depois de todas as correções aplicadas na sessão, e um
cronograma do que ainda falta.

## Diagnóstico — o que foi feito hoje

Projeto Supabase `eohshxaxbsdpxundsley`. Advisor de performance saiu de **201
ocorrências** para **136** (confirmado via `get_advisors` depois da última migration);
de segurança, **6 achados reais de vazamento de acesso** encontrados ao longo do dia (3
no diagnóstico inicial, mais 3 numa segunda passada ao puxar o texto exato das policies
antes de consolidar as redundâncias de performance) — todos corrigidos e confirmados em
produção. Sequência de migrations aplicadas:

| # | Migration | O que resolveu |
|---|---|---|
| 1 | `rls-hardening-select-leaks-2026-08-11-APLICAR.sql` | Vazamento real: `editais` e `transparencia_editais` liam rascunho/não-publicado por policy `qual=true` concorrente; `convites_org` expunha convites sem token. |
| 2 | `rls-consolida-duplicatas-2026-08-11-APLICAR.sql` | 6 tabelas com policies literalmente duplicadas (`assinaturas`, `logs_atividade`, `eventos`, `paginas_conteudo`, `projetos_destaques`, `projetos_resultados`) reduzidas a 1 cada. |
| 3 | `rls-documenta-service-role-only-2026-08-11-APLICAR.sql` | 49 tabelas com RLS ligado e zero policy — comportamento já correto (nega tudo que não for service_role), agora com policy explícita e auditável. |
| 4 | `rls-split-write-mestre-2026-08-11-APLICAR.sql` | `admin_escopos`/`admin_perfis`/`processos_contratacao`: policy `_write_mestre` (FOR ALL) cujo SELECT era subconjunto provado de outra policy — dividida em INSERT/UPDATE/DELETE, SELECT redundante removido. |
| 5 | *(sem arquivo próprio — fix de regressão)* | As migrations 1 e 4 usaram `auth.uid()` direto em vez de `(select auth.uid())` em 11 policies, sinalizado como `auth_rls_initplan`. Corrigido via `ALTER POLICY`. |
| 6 | `rls-hardening-select-leaks-transparencia-2026-08-11-APLICAR.sql` | **Vazamento real novo, achado numa segunda auditoria**: `transparencia` tinha policy de UPDATE com nome enganoso liberando escrita pra qualquer `authenticated` (não só admin); `transparencia_convenios` e `transparencia_prestacao_contas` tinham o mesmo padrão de `qual=true` anulando o filtro `publicado=true` já corrigido em editais/transparencia_editais na migration 1. |
| 7 | `rls-split-admin-all-paginas-projetos-2026-08-11-APLICAR.sql` | 8 tabelas (`paginas_blocos`, `paginas_cards`, `paginas_conteudo`, `paginas_eixos`, `paginas_itens`, `projetos_destaques`, `projetos_eixos`, `projetos_resultados`) com o mesmo padrão de `_write_mestre` da migration 4 — `_admin_all` (FOR ALL) com SELECT redundante contra uma policy pública `qual=true`. Dividida em INSERT/UPDATE/DELETE. |
| 8 | `rls-fix-projetos-admin-scope-2026-08-11-APLICAR.sql` | 4 policies de `projetos` com `roles={public}` em vez de `{authenticated}` — único caso desse padrão no banco, inofensivo mas inconsistente. Corrigido. |
| 9 | `rls-gate-orphan-tables-2026-08-11-APLICAR.sql` | **Achado mais sério do dia**, numa varredura completa (não só nas tabelas que o advisor sinalizava — `multiple_permissive_policies` só pega redundância, não uma policy sozinha perigosamente aberta): 7 tabelas (`api_tokens`, `beneficiarios`, `org_membros`, `organizacoes`, `portal_tokens`, `lgpd_consentimentos`, `lgpd_solicitacoes`) com `FOR ALL`/`SELECT`/`UPDATE` liberado pra **qualquer `authenticated`**, sem gate de `is_admin()` — diferente do padrão usado em todo o resto do banco. Inclui dados de LGPD, beneficiários e tokens de API/portal. Nenhuma dessas 7 tabelas tem consumidor no código (grep vazio em app/lib/services/scripts) e não há fluxo de auto-cadastro no app, então "authenticated" só pode ser staff manual — mas ainda assim, qualquer funcionário logado (não só admin) tinha acesso total. Corrigido para `is_admin()`, mantendo os INSERTs públicos já existentes (formulário de solicitação/consentimento LGPD). |
| 10 | `rls-fix-editais-logs-e-scope-restante-2026-08-11-APLICAR.sql` | **Achado oposto — bug funcional, não vazamento**: `editais_logs` tinha só uma policy com `qual=false`, negando *todo mundo sempre, inclusive admin*. Confirmado no código (`app/admin/editais/[id]/governanca/page.tsx`) que insere e deleta logs de governança via cliente de sessão — estava falhando silenciosamente pra admin de verdade em produção (o insert nem checava o erro). Corrigido com policies `is_admin()` de select/insert/delete. De quebra, padronizado `contato_mensagens` e `proposta_anexos` (mesmo ajuste de role `{public}`→`{authenticated}` de `projetos`, inofensivo mas consistente). |

**Nota sobre a migration 6:** não estava no escopo do diagnóstico inicial (que só
auditou um subconjunto de tabelas de transparência). Foi encontrada só porque, ao
puxar o texto exato de cada policy antes de consolidar as redundâncias de
performance (disciplina de "não assumir, confirmar" já usada antes), os mesmos
padrões de vazamento apareceram em tabelas que ainda não tinham sido olhadas de
perto. Reforça que vale a pena revisar o texto real de toda policy antes de mexer,
mesmo quando o objetivo declarado é só "otimização".

Estado atual do advisor de performance: **136 ocorrências**, todas de baixa prioridade
e nenhuma delas apontando para acesso incorreto:

- **130 `unused_index`** — inalterado (RLS não afeta uso de índice). Decisão já tomada
  em `DIAGNOSTICO-VALIDACAO-PLATAFORMA-2026-08-11.md` seção 5: não remover agora,
  reavaliar depois de mais tempo real de produção.
- **6 `multiple_permissive_policies`** restantes, todas revisadas e deixadas de
  propósito (nenhuma é vazamento):
  - `processos_contratacao`: `processos_select_admin` + `processos_select_escopo` —
    genuinamente distintas (acesso por papel vs. acesso delegado por linha).
  - `profiles`: `profiles_select_admin` + `profiles_select_own` — genuinamente
    distintas (admin vê tudo, usuário vê o próprio).
  - `transparencia_convenios`, `transparencia_editais`, `transparencia_prestacao_contas`:
    `*_select_admin` (`is_admin()`, vê tudo inclusive não publicado) +
    `public_read_*` (`publicado=true`) — mesmo padrão de `processos_contratacao`, não é
    subconjunto porque admin precisa ver *mais* que o público, não é redundante.
  - `projetos` — **CORRIGIDO.** As 4 policies `projetos_*_admin` estavam com role
    `{public}` em vez de `{authenticated}` (único caso no banco com esse padrão).
    Aplicado `rls-fix-projetos-admin-scope-2026-08-11-APLICAR.sql`: restrito para
    `{authenticated}`, mesma condição — zero mudança de acesso, `anon` nunca
    satisfazia `is_admin()` mesmo antes. Confirmado em produção.

## Cronograma do que falta

| Item | Quem faz | Esforço | Bloqueio |
|---|---|---|---|
| "Leaked password protection" no Auth | Equipe/financeiro | — | **Confirmado bloqueado pelo plano**: tentativa real no dashboard falhou com "available on Pro Plans and up". Projeto está no Free. Só resolve com upgrade pago, não é mais pendência técnica. |
| Reavaliar os índices não usados restantes | Conjunto (equipe decide o que descartar) | — | Precisa de mais tempo real de produção antes de qualquer decisão |
| Retomar ou formalmente abandonar a Fase 2 multi-admin (`docs/MULTI-ADMIN-FASE-2-RLS.md`) | Equipe/produto decide | — | Decisão de escopo/roadmap, não é técnico |

Nada nessa lista é urgente — todos os achados de segurança com impacto real (acesso
indevido) já estão corrigidos e confirmados em produção. O que resta é otimização de
performance de baixíssimo risco e decisões de produto, não vazamento de dados.

## Aviso para quando as tabelas órfãs ganharem feature real

`api_tokens`, `beneficiarios`, `org_membros`, `organizacoes`, `portal_tokens`,
`lgpd_consentimentos`, `lgpd_solicitacoes` foram travadas em `is_admin()` (migration 9)
porque hoje não têm nenhuma feature construída usando-as. Se algum dia alguém construir
em cima delas (ex.: um membro de organização vendo só a própria org, ou um beneficiário
vendo o próprio registro), a policy `is_admin()` vai ser boa demais pro admin e ruim
demais pra esse novo caso de uso — vai precisar ser revisada para refletir o modelo de
permissão real da feature, não é "deixar como está para sempre".

## Metodologia desta sessão

`get_advisors` (security + performance) antes e depois de cada migration, leitura
direta de `pg_policies`/`pg_get_functiondef` para confirmar condições exatas antes de
alterar qualquer policy (nunca por suposição — foi assim que a migration 6 apareceu),
checagem cruzada no código (`grep`) para confirmar qual cliente Supabase
(anon/service_role/sessão) cada rota usa antes de mudar RLS que pudesse afetá-la, e
verificação pós-aplicação via SQL depois de cada migration.
