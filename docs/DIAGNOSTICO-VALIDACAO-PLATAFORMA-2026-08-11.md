# Diagnóstico e validação da plataforma — 2026-08-11

Escopo: auditoria do banco Supabase (`eohshxaxbsdpxundsley`) — segurança e performance via
`get_advisors`, inspeção direta de `pg_policies` e verificação cruzada com o código da
aplicação.

**Atualização 2026-08-11:** os achados de prioridade alta da seção 1 (editais,
convites_org, transparencia_editais) foram corrigidos e aplicados em produção via
`docs/sql/rls-hardening-select-leaks-2026-08-11-APLICAR.sql`. As seções 2 a 5
permanecem apenas diagnóstico, sem alteração.

**Continuação:** ver `docs/DIAGNOSTICO-CRONOGRAMA-RLS-2026-08-11.md` para o estado
final da sessão (inclui a correção de um `auth_rls_initplan` que eu mesmo introduzi
usando `auth.uid()` sem `select` em 11 policies novas) e o cronograma do que resta.

## Resumo executivo

O advisor de performance aponta 71 ocorrências de "multiple permissive policies" em 22
tabelas e 130 índices nunca usados em 60 tabelas. Ao inspecionar as policies reais por
trás desses números, a maior parte é ruído de nomenclatura (policies repetidas por
re-execução de migration), mas **duas tabelas têm um problema de segurança real**: a
duplicidade de policies não é só redundância de performance, ela anula um filtro que
deveria restringir o acesso anônimo. Isso é detalhado na seção 1.

## 1. Achados de segurança — prioridade alta (CORRIGIDO)

### 1.1 `editais`: leitura anônima sem filtro nenhum, apesar de existir uma policy restritiva

A tabela tem simultaneamente:

| Policy | Papel | Condição |
|---|---|---|
| `editais_anon_select` | anon | `fase_atual <> 'rascunho' AND ativo = true` |
| `allow select editais` | anon | `true` |
| `Public read editais` | public | `ativo = true` |
| `editais_public_select` | public | `true` |
| `public_select_editais` | anon, authenticated | `true` |

Policies PERMISSIVE são combinadas com **OR**, não AND. Como existem três policies com
condição literal `true` cobrindo `anon`, o filtro de `editais_anon_select` (esconder
rascunhos) nunca chega a ser aplicado na prática: qualquer usuário anônimo já pode ler
100% das linhas de `editais`, incluindo as com `fase_atual = 'rascunho'` e `ativo = false`.

Além disso, `editais_auth_all` é `cmd = ALL`, `roles = {authenticated}`, `qual = true`,
`with_check = true` — ou seja, **qualquer usuário autenticado** (não só admin) pode
inserir, atualizar ou apagar editais, apesar de existirem `editais_insert_admin`,
`editais_update_admin` e `editais_delete_admin` com `is_admin()`. A policy `_all` aberta
faz as policies "_admin" se tornarem decorativas para quem só precisa estar logado.

**Impacto:** rascunhos de edital ficam publicamente legíveis, e qualquer conta logada
(não necessariamente admin) pode escrever na tabela.

### 1.2 `convites_org`: convite de organização legível por qualquer pessoa, sem token

```
anon_select_convite_by_token | SELECT | roles={public} | qual = true
```

Apesar do nome sugerir "select por token", a condição é `true` — não há nenhuma
comparação com token na policy. Isso permite listar todos os convites pendentes
(inclusive o token de convite) sem autenticação, o que pode ser usado para entrar em
uma organização sem ter recebido o convite legitimamente.

**Impacto:** possível tomada de convites de organização por terceiros.

### 1.3 `transparencia_editais`: mesmo padrão do item 1.1, em menor escala

```
anon_select_transparencia_editais | SELECT | anon            | qual = true
public_read_transparencia_editais | SELECT | anon,authenticated | qual = (publicado = true)
auth_read_transparencia_editais   | SELECT | authenticated   | qual = true
auth_select_transparencia_editais | SELECT | authenticated   | qual = true
```

A policy `anon_select_transparencia_editais` (`true`) anula o filtro `publicado = true`
de `public_read_transparencia_editais` para o papel anon. Registros não publicados de
transparência de editais ficam visíveis publicamente.

## 2. Achados de segurança — prioridade média (WARN do advisor)

- **`auth_leaked_password_protection` desabilitado — bloqueado pelo plano do projeto.**
  Tentativa de ligar em Auth → Providers → Email → "Prevent use of leaked passwords"
  falhou com: *"Configuring leaked password protection via HaveIBeenPwned.org is
  available on Pro Plans and up."* O projeto Supabase (`eohshxaxbsdpxundsley` /
  `site-ipecc`) está no plano Free — essa proteção específica é paga, não é uma
  config que dê pra ativar sem upgrade. Fica registrado como decisão de custo, não
  como pendência técnica: só resolve fazendo upgrade do projeto para o plano Pro.
- **Funções `SECURITY DEFINER` expostas via RPC — revisadas, sem problema encontrado.**
  Li o corpo das três funções (`pg_get_functiondef`):
  - `is_admin(user_id uuid default auth.uid())`: só retorna um booleano (existe linha
    ativa em `profiles` com `role='admin'`). Aceita `user_id` arbitrário — qualquer
    autenticado pode checar se *outro* UUID é admin — mas não vaza nada além do
    booleano, e é o padrão recomendado do próprio Supabase para funções usadas dentro
    de `USING`/`WITH CHECK` de RLS. Sem ação necessária.
  - `is_admin_ou_perfil(p_user_id uuid)`: mesma natureza, só booleano.
  - `validar_portal_token(p_token text)`: retorna `label`, `descricao`, `valido` só da
    linha cujo `token` bate exatamente com o parâmetro — não há enumeração possível sem
    já ter o token, e o `SECURITY DEFINER` é necessário porque `portal_tokens` não tem
    policy de leitura para `anon`. O `UPDATE` de contador de acesso dentro da função é
    o comportamento pretendido (rastrear uso do link do portal), não um efeito colateral
    indevido. Sem ação necessária.
- **~50 tabelas com RLS habilitado e nenhuma policy — CORRIGIDO (documentado).**
  49 tabelas (`gd_*` de Gestão Documental, `digital_*` do módulo de posts, mais
  `whatsapp_leads`, `whatsapp_conversations`, `logs_download`, `rate_limits`,
  `usuarios_admin`) tinham RLS ligado sem nenhuma policy — o que já bloqueava
  `anon`/`authenticated` por padrão (`service_role` sempre ignora RLS via BYPASSRLS,
  com ou sem policy). Confirmado no código que o acesso a essas tabelas hoje é só
  via `service_role` (`supabaseAdmin`) em rotas server-side. Apliquei
  `docs/sql/rls-documenta-service-role-only-2026-08-11-APLICAR.sql`, que cria uma
  policy `<tabela>_service_role_only` em cada uma dessas tabelas — um no-op de acesso
  (só formaliza o comportamento que já existia), mas agora auditável e sem o ruído do
  advisor "RLS Enabled No Policy". Confirmado: 0 tabelas restantes sem policy.

## 3. Performance — duplicação pura (CORRIGIDO — consolidado sem mudar acesso)

Estas policies têm exatamente a mesma condição, só o nome muda (resíduo de migrations
repetidas). Consolidar (manter uma, remover a outra) não altera quem tem acesso a quê:

| Tabela | Ação/papel | Policies duplicadas |
|---|---|---|
| `assinaturas` | ALL / public | `service role full access on assinaturas` + `service_role_all_assinaturas` (ambas `auth.role() = 'service_role'`) |
| `logs_atividade` | INSERT / anon | `allow insert logs` + `allow_insert_logs` (ambas `with_check = true`) |
| `eventos` | SELECT / public | `eventos_public_read` + `public read eventos` (ambas `true`) |
| `paginas_conteudo` | SELECT / anon+public | `Public read paginas_conteudo` + `allow_public_select` + `allow_public_select_paginas_conteudo` + `public_read_paginas_conteudo` (todas `true`) |
| `projetos_destaques` | SELECT / public | `allow read` + `public_read_projetos_destaques` (ambas `true`) |
| `projetos_resultados` | SELECT / public | `Permitir leitura pública` + `public_select` (ambas `true`) |

Aplicado via `docs/sql/rls-consolida-duplicatas-2026-08-11-APLICAR.sql`: cada grupo
acima foi reduzido a uma única policy (`<tabela>_public_select` /
`assinaturas_service_role_all` / `logs_atividade_insert_anon`), condição idêntica à
anterior. Confirmado em produção: 1 policy por combinação tabela/comando/papel.

## 4. Performance — sobreposição intencional

Nestas tabelas o advisor também aponta "multiple permissive policies", mas as condições
são **diferentes por design** — a sobreposição é uma regra de negócio (ex.: "dono vê a
própria linha OU mestre vê tudo"), não duplicidade pura.

- `admin_escopos`, `admin_perfis`, `processos_contratacao` — **CORRIGIDO.** Antes da
  correção, cada uma tinha uma policy `*_write_mestre` `FOR ALL` (cobrindo também
  SELECT) cuja condição (`mestre ativo OR is_admin()`) era **comprovadamente
  subconjunto** de outra policy de SELECT já existente na mesma tabela
  (`*_select_own_or_mestre` em admin_escopos/admin_perfis; `processos_select_admin` via
  `is_admin_ou_perfil()` em processos_contratacao — ser mestre implica ter linha ativa
  em `admin_perfis`, que já satisfaz `is_admin_ou_perfil()`). Prova conferida linha a
  linha contra `docs/sql/multi-admin-processos-fase-1.sql` antes de aplicar. Apliquei
  `docs/sql/rls-split-write-mestre-2026-08-11-APLICAR.sql`: cada `*_write_mestre` virou
  3 policies (`_insert_mestre`/`_update_mestre`/`_delete_mestre`), removendo só a parte
  de SELECT que já era redundante. Confirmado em produção: `admin_escopos` e
  `admin_perfis` caíram para 1 policy de SELECT; `processos_contratacao` ficou com 2
  (`processos_select_admin` + `processos_select_escopo`, que são genuinamente distintas
  — ver abaixo — e continuam separadas).
  - Durante essa investigação encontrei `docs/MULTI-ADMIN-FASE-2-RLS.md`, que descreve
    uma Fase 2 (escopo por processo em `editais`/`noticias`/`eventos`/
    `documentos_publicos`/`propostas`) com o SQL pronto em
    `docs/sql/multi-admin-processos-fase-2-rls.sql`, mas **nunca aplicado em produção**.
    O próprio documento diz "Deploy: só quando o pacote final for liberado (não precisa
    ir ao ar agora)" — é um adiamento proposital, não uma pendência esquecida, e não
    tem nenhuma sobreposição com as 3 tabelas corrigidas aqui (tabelas diferentes).
    Registrando só para ficar visível: se algum dia a Fase 2 for retomada, vale
    reconferir se as policies que ela cria colidem com as que já existem hoje em
    `editais`/`transparencia_editais` (seção 1 deste relatório).
- `processos_contratacao` — a policy `processos_select_escopo` (usuário com escopo
  delegado para aquele processo específico, linha a linha) continua genuinamente
  distinta de `processos_select_admin` e foi mantida sem alteração — é controle de
  acesso delegado, não duplicidade.
- `profiles` — admin vê todos os perfis, usuário vê o próprio — union correta, não
  mexi.

## 5. Índices não usados

130 índices sem nenhum uso registrado, espalhados por 60 tabelas (nível INFO do
advisor). A maior concentração é no módulo `gd_*` (Gestão Documental), que tem baixo
volume de dados em produção ainda — plausível que os índices simplesmente não tenham
sido exercitados por falta de tráfego, não por serem desnecessários. Não recomendo
remover nada agora; recomendo reavaliar depois de um período de uso real em produção
(a estatística de uso do Postgres zera em reinício/restore, então "nunca usado" pode
só significar "ambiente jovem").

## 6. Recomendações priorizadas

1. **Alta — corrigir antes de qualquer divulgação pública de conteúdo sensível em
   `editais`/`transparencia_editais`:** remover as policies `qual = true` que
   sobrepõem os filtros de rascunho/publicado (`allow select editais`,
   `editais_public_select`, `public_select_editais`, `anon_select_transparencia_editais`)
   e a `editais_auth_all` (ALL, qual=true) que abre escrita para qualquer autenticado.
2. **Alta — `convites_org`:** trocar `anon_select_convite_by_token` (`qual = true`) por
   uma condição real de comparação de token (ex.: `token = current_setting(...)` ou via
   RPC `SECURITY DEFINER` que recebe o token como parâmetro em vez de expor a tabela
   inteira por SELECT).
3. **Média:** ativar leaked password protection no Auth; confirmar que as 3 funções
   `SECURITY DEFINER` não vazam mais que o necessário.
4. **Baixa:** consolidar as duplicatas puras da seção 3 (ganho de performance, zero
   risco de acesso).
5. **Baixa / backlog:** revisitar índices não usados após mais tempo de produção real.
6. **Cosmético/documentação:** para as ~50 tabelas "RLS sem policy" que já são
   service-role-only por design, adicionar uma policy explícita de negação (ou um
   comentário na tabela) para deixar a intenção auditável e parar o ruído do advisor.

## Metodologia

- `mcp__Supabase__get_advisors` (security e performance) no projeto
  `eohshxaxbsdpxundsley`.
- Leitura direta de `pg_policies` (schema `public`, `permissive = 'PERMISSIVE'`) para
  todas as tabelas apontadas pelo advisor como tendo múltiplas policies permissivas.
- Checagem cruzada no código (`grep` por `supabaseAdmin`, imports em
  `lib/whatsapp/*`, `app/api/download/[...path]/route.ts`) para confirmar quais tabelas
  sem policy são acessadas exclusivamente via service role.
- Nenhuma migration foi aplicada; nenhuma policy, índice ou função foi alterado.
