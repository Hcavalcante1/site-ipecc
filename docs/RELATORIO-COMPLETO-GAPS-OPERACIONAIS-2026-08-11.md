# Relatório completo — o que falta para o site estar 100% operacional (2026-08-11)

Compilado a partir de: leitura de código (`site-ipecc`, repositório que realmente
alimenta o deploy), consultas diretas ao banco Supabase (`eohshxaxbsdpxundsley`,
único projeto — não há staging separado), navegação real do site local via
Playwright, e checagem dos arquivos de ambiente (`.env.local`) de produção.

Metodologia e limitação: este ambiente de sessão bloqueia acesso de rede direto
a qualquer domínio fora de uma lista pré-aprovada (nem o Supabase, nem
`www.ipecc.org.br` são alcançáveis por HTTP/browser daqui — confirmado via
`curl $HTTPS_PROXY/__agentproxy/status`, é política da organização, não algo
contornável). Isso foi resolvido, onde possível, consultando o banco
diretamente pelo canal MCP (que não passa por essa restrição) para confirmar
dados reais em vez de depender só da navegação local, que falha silenciosamente
sem rede. Onde isso não foi suficiente, está marcado explicitamente abaixo.

---

## 1. Conteúdo público realmente vazio em produção (confirmado via banco, não é bug de rede)

| Página | Registros no banco | Visíveis ao público | Situação |
|---|---|---|---|
| `/editais` | 3 | **0** | Todos os 3 editais estão em `fase_atual=rascunho` ou `ativo=false` |
| `/transparencia` — editais | 0 | 0 | Tabela `transparencia_editais` **completamente vazia** |
| `/transparencia` — convênios | 0 | 0 | Tabela `transparencia_convenios` **completamente vazia** |
| `/transparencia` — prestação de contas | 0 | 0 | Tabela `transparencia_prestacao_contas` **completamente vazia** |
| tabela `projetos` | 0 | 0 | A página `/projetos` provavelmente ainda renderiza via CMS (`paginas_conteudo` tem 52 blocos), mas a tabela dedicada de projetos está vazia |
| `/noticias` | 2 | 2 | OK — tem conteúdo real |
| `/eventos` | 2 | 2 | OK — tem conteúdo real |
| `/org/ipecc` | 1 organização ativa | 1 | OK — visível (o 404 visto na navegação local foi só bloqueio de rede do sandbox, não bug real) |

**Ação necessária:** publicar pelo menos 1 edital ativo (ou confirmar que isso é
proposital — nenhum edital aberto no momento) e decidir se as seções de
transparência (editais/convênios/prestação de contas) devem ter conteúdo ou
ficar ocultas enquanto vazias (hoje aparecem como seção vazia, o que pode
parecer erro pra quem visita).

---

## 2. Fluxo de contratação/venda — não existe de ponta a ponta

Este foi o ponto que motivou o relatório. Evidência completa:

- **Sem página pública de preços/planos.** Não existe `/planos`, `/precos`,
  `/contratar` nem nada equivalente.
- **Sem cadastro (signup).** `/login` só tem login — não há "criar conta" em
  lugar nenhum do site.
- **O menu principal não linka pra nenhuma dessas telas.** `PublicSiteShell.tsx`
  só tem: Início, Quem Somos, Projetos, Editais, Transparência, Contato. Um
  visitante não descobre que existe uma plataforma pra contratar.
- **Checkout (Stripe) existe no código mas está inacessível e com bug:**
  - Só é chamado de dentro do painel admin (`/admin/faturamento`,
    `/admin/configuracoes`) — nunca do site público.
  - Exige usuário já autenticado.
  - **Bug real:** em vez de usar a organização do usuário logado, a query faz
    `.from("organizacoes").order("created_at").limit(1)` — pega **a
    organização mais antiga de todo o banco**, não a do usuário. Se existir
    mais de uma organização no futuro, o checkout vai cobrar/assinar a errada.
  - Depende de `STRIPE_SECRET_KEY`, que **não está configurada em produção**
    (confirmado no `.env.local` real) — a rota retorna erro 503 imediatamente.
- **A feature de multi-tenant nunca foi usada de verdade, nem uma vez:**
  - `org_membros`: **0 registros** — nenhuma pessoa jamais foi vinculada a
    nenhuma organização, nem a padrão.
  - `api_tokens`: **0 registros** — apesar de existir `/api-docs` e uma tela
    admin completa pra gerenciar tokens, ninguém nunca criou um.
  - `beneficiarios`: **0 registros** — tela admin completa, zero uso.
  - `organizacoes`: 1 registro — só a organização padrão do próprio IPECC.

**Conclusão:** o backend de cobrança foi começado (código do Stripe existe,
telas admin existem), mas o caminho "visitante descobre → vê preço → assina →
vira cliente" nunca foi terminado nem testado com um cliente real. Hoje, virar
cliente dependeria 100% de alguém da equipe IPECC criar tudo manualmente pelo
admin — e mesmo assim, o botão de cobrar (Stripe) não funcionaria sem a chave
configurada.

---

## 3. E-mail transacional desligado em produção

`RESEND_API_KEY`, `EMAIL_CONTATO`, `EMAIL_ORCAMENTO`, `EMAIL_ADMIN` — **nenhuma
dessas variáveis está configurada** no ambiente de produção (`.env.local`
real, só `ADMIN_EMAILS` existe, e está vazia: `ADMIN_EMAILS=""`).

Efeito prático:
- **Convite de organização por e-mail não é enviado.** `app/api/admin/convites/route.ts`
  degrada graciosamente (`if (apiKey) { ... }`) — cria o convite no banco, mas
  pula o envio do e-mail silenciosamente. Quem convida precisa copiar o link
  manualmente e mandar por outro canal.
- Provavelmente o formulário `/contato` também não dispara notificação por
  e-mail pra equipe (mesma dependência de Resend).

---

## 4. Segurança — resolvido hoje (resumo, detalhes em `docs/DIAGNOSTICO-*` e `docs/INCIDENTE-*`)

- 10 vazamentos reais de RLS corrigidos e confirmados em produção.
- 1 regressão causada por diagnóstico incompleto (trabalhar no repo errado),
  identificada e corrigida na mesma sessão.
- `convites_org` fechado de vez com função `SECURITY DEFINER` por token.
- **Pendente, fora do alcance técnico desta sessão:** "leaked password
  protection" do Supabase Auth — feature paga, bloqueada pelo plano Free do
  projeto. Decisão de custo, não técnica.

---

## 5. Estrutural — dois repositórios divergentes

`ipecc-whatsapp-leads` (onde o diagnóstico de RLS começou) e `site-ipecc`
(o que realmente alimenta o deploy no Vercel) divergiram significativamente —
não são mais espelhos um do outro. Isso já causou uma regressão real hoje
(seção 4). Recomendação registrada anteriormente: escolher um dos dois como
canônico e aposentar o outro — decisão de processo, não técnica, cabe à
equipe.

---

## 6. Configuração morta (não é bug, mas é lixo que confunde)

`PILOT_INVITE_ONLY` e `PLAN_ENFORCEMENT` estão definidas no ambiente de
produção mas **não são referenciadas em nenhum lugar do código** — são
vestígios de uma ideia (provavelmente "fase piloto, só por convite") que
nunca foi implementada. Não fazem nada hoje.

---

## 7. O que está funcionando de verdade (pra dar o contraste)

- **Gestão documental (`gd_*`) está em uso real**: 149 documentos, 11 pastas —
  não é feature órfã, tem gente usando.
- `noticias` e `eventos` têm conteúdo real e aparecem corretamente.
- `admin_perfis`: 5 contas de staff ativas — o painel administrativo em si é
  usado.
- Todas as 28 rotas testadas (público + admin) carregam sem crash, erro 500
  ou exceção não tratada.
- Proteção de rotas `/admin/*` funciona corretamente (redireciona pra login
  sem sessão).
- RLS agora está correto e sem vazamentos conhecidos.

---

## 8. Lista objetiva de pendências, por quem resolve

| Pendência | Quem resolve | Tipo |
|---|---|---|
| Publicar edital(is) ativo(s) ou confirmar que é proposital estar vazio | Equipe de conteúdo | Conteúdo |
| Popular ou ocultar seções vazias de transparência | Equipe de conteúdo | Conteúdo |
| Decidir se o módulo multi-tenant/billing vai pra frente ou é descontinuado | Produto | Decisão de negócio |
| Se for pra frente: criar página pública de planos + cadastro + linkar no menu | Dev | Feature nova |
| Corrigir o bug do checkout (pega org errada) | Dev | Bug |
| Configurar `STRIPE_*` em produção (se o billing for mesmo usado) | Quem administra o Vercel | Config |
| Configurar `RESEND_API_KEY`/`EMAIL_*` em produção | Quem administra o Vercel | Config |
| Remover `PILOT_INVITE_ONLY`/`PLAN_ENFORCEMENT` mortas ou implementá-las de verdade | Dev | Limpeza/decisão |
| Decidir sobre a divergência `ipecc-whatsapp-leads` vs `site-ipecc` | Equipe/produto | Decisão estrutural |
| Ligar leaked password protection (Supabase) | Quem decide orçamento | Custo |
| Reavaliar 130 índices não usados | Dev, com mais tempo de produção | Performance, não urgente |
| Retomar ou abandonar formalmente a Fase 2 multi-admin | Produto | Decisão de roadmap |

Nada nessa lista é segurança/vazamento de dado — isso já foi fechado hoje. É
tudo completude de produto e configuração de ambiente.
