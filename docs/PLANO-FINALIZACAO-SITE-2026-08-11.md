# Plano de finalização do site — 2026-08-11

Atualiza `docs/DIAGNOSTICO-E-CRONOGRAMA-PRODUCAO.md` (2026-06-01) e
`docs/PROD-PREP-CHECKLIST.md` com o estado real verificado hoje. Não substitui
esses documentos — complementa com o que mudou desde então e corrige uma
informação desatualizada encontrada no processo.

## Esclarecimento importante: não existe staging separado de produção

Documentos anteriores tratam `eohshxaxbsdpxundsley` como "staging" e falam em
aplicar RLS depois "no projeto correto de produção". Verificado hoje via
`list_projects`: essa conta Supabase tem só 3 projetos (`radar-publico` — inativo,
não relacionado; `site-ipecc` = `eohshxaxbsdpxundsley` — o único do site; `prometheus`
— não relacionado). **Não existe um segundo projeto Supabase de produção.**
`eohshxaxbsdpxundsley` é o banco real, o mesmo que `.env.local` aponta. Todo o
hardening de RLS feito hoje (ver `docs/DIAGNOSTICO-CRONOGRAMA-RLS-2026-08-11.md`)
foi aplicado no banco que efetivamente vai (ou já) atende produção — não uma cópia
descartável.

## Achado que exige atenção: checklist antigo tinha item marcado errado

`docs/PROD-PREP-CHECKLIST.md` seção 2 marcava `[x]` "RLS `editais` — rascunhos
ocultos do público, admins veem tudo — aplicado". Isso **não era verdade**: existia
uma policy `qual=true` (`allow select editais`) que anulava esse filtro, expondo
rascunhos publicamente, corrigida hoje. Motivo provável: quem validou esse item
não checou o texto exato de cada policy concorrente, só confirmou que a policy
"certa" existia — sem notar que uma policy "errada" também existia ao lado dela e
a anulava. Recomendo não confiar cegamente nos `[x]` desse checklist sem
reconferir contra `pg_policies` antes do go-live — pelo menos os itens de RLS da
seção 2, que é exatamente onde o gap apareceu.

## Estado real por etapa (cronograma original de 10 etapas)

| Etapa | Status em 2026-06-01 | Status verificado hoje 2026-08-11 |
|---|---|---|
| 1. Congelar escopo | Não feito | Sem evidência de decisão formal registrada — não verificável por mim |
| 2. Revisão de conteúdo/CMS | Pendente | **Feito** — `VISUAL-GO-LIVE-CHECKLIST.md`: CMS limpo (APECC→IPECC, lixo removido, 0 registros de teste), confirmado via SQL 2026-08-02/03 |
| 3. QA visual/funcional público | Pendente | **Feito com ressalvas** — Playwright 2026-08-03, 13 páginas × 2 viewports, HTTP 200 em todas, "aprovado com ressalvas" (não é aprovação incondicional) |
| 4. QA admin e propostas | Pendente | **Feito** — `validar:admin`, `audit:anexos`, `verify:proposta-anexos` OK conforme `validar:push-prep` (2026-08-03) |
| 5. Gates técnicos finais | Pendente | **Parcial** — `typecheck` rodei agora, passou limpo. `validar:seguranca` não roda neste ambiente (egress de rede bloqueado para o host do Supabase) — precisa rodar num ambiente com acesso de rede real (máquina do time ou CI) |
| 6. Preparar Supabase produção | Pendente | **Feito, e mais robusto agora** — RLS hardening completo hoje (10 vazamentos reais fechados, ver diagnóstico RLS). Único item real pendente: leaked password protection, bloqueado pelo plano Free (decisão de custo) |
| 7. Configurar host de deploy | Pendente | **Feito** — Vercel com integração nativa GitHub (commits recentes removeram o workflow manual de deploy em favor da integração automática) |
| 8. Rollout de flags | Pendente | **Feito** — `proposta_anexos` M1-M4 aplicado e verificado em produção (`PROD-PREP-CHECKLIST.md` seção 3, todos os itens `[x]`) |
| 9. Deploy e smoke pós-produção | Pendente | **Não verificado por mim** — ver limitações abaixo |
| 10. Pós-go-live | Pendente | Não aplicável ainda |

## O que eu não consigo verificar neste ambiente

- Não tenho browser nem `npm run dev` acessível de forma útil para os smokes que
  exigem navegar o site (mobile físico, `/quem-somos` hidratado, envio real de
  formulário).
- Egress de rede deste sandbox não alcança o host REST do Supabase diretamente —
  scripts como `validar:seguranca`, `audit:anexos`, `validar:pre-m4-corte` que
  fazem chamadas HTTP diretas não rodam aqui de forma confiável (o que apareceu
  como "OK" no log foi na verdade bloqueio de rede, não validação real).
- Não sei se o deploy Vercel de produção já está publicado com o código mais
  recente ou se ainda depende de um push/merge para `main` — a branch de hoje
  (`claude/diagnostico-validacao-plataforma-lfiqu1`) não foi mergeada.

## Bloqueio real restante antes da etapa 9

Pelo que dá pra confirmar com o que tenho: **tecnicamente o site parece pronto**
para as etapas 1-8. O que falta antes de eu poder dizer "etapa 9 pode prosseguir":

1. **Rodar os gates técnicos que dependem de rede/browser num ambiente com
   acesso real** (`validar:seguranca`, `validar:release-prep`, `ci:local`,
   `guard:enterprise`, smoke visual em celular físico) — isso precisa ser feito
   fora deste sandbox, pela equipe ou numa sessão com acesso de rede liberado.
2. **Decisão explícita de quem autoriza o go-live** — nenhum documento registra
   "responsável e data" (critério que o próprio cronograma de junho exige antes
   de ir a produção).
3. **Decidir sobre o merge desta branch para `main`** — as correções de RLS de
   hoje estão em `claude/diagnostico-validacao-plataforma-lfiqu1`, não em `main`.
   Como o Vercel parece fazer deploy automático a partir de `main`, dar merge é,
   na prática, o gatilho do deploy.

Não vou dar merge nem disparar deploy sem confirmação explícita sua — é uma ação
de alto impacto (produção real) e o ponto 3 acima é literalmente a etapa 9.
