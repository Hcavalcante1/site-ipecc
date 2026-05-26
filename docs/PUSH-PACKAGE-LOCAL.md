# Pacote local — pronto para push (quando autorizar)

**Atualizado:** 2026-05-26 · **Branch:** `master` · **HEAD:** `0619936` · **Remote:** nenhum

## Estado do repositório

```text
Branch: master
Remote: (vazio — não executar push sem autorização)
Working tree: código commitado (BATCH 8–17 + WhatsApp bot + pré-cadastro público)
Pendente local: .env.local, tsconfig.tsbuildinfo, .cursor/
```

## Commits WhatsApp site público (pré-cadastro)

| Hash | Mensagem |
|------|----------|
| `bdd3219` | docs(whatsapp): roteiro futuro de leads e push-prep OK |
| `4b9568f` | chore(whatsapp): validacao de paginas publicas e foco no formulario |
| `c423878` | feat(whatsapp): linha de ajuda em editais e transparencia |
| `b03b40e` | feat(whatsapp): link de ajuda em propostas e gate push-prep |
| `40575a9` | feat(whatsapp): menu WhatsApp e CTA na pagina de contato |
| `5303258` | feat(whatsapp): pre-selecionar assunto por pagina no pre-cadastro |
| `167cb09` | feat(whatsapp): conectar CTAs e links de contato ao pre-cadastro |
| `ae5e8fd` | fix(whatsapp): remover FAB e abrir formulario pelos gatilhos do site |
| `8a6ec5a` | feat(whatsapp): formulario lead flutuante antes do wa.me |
| `a7043d0` | fix(whatsapp): remover item WhatsApp do menu principal publico |
| `ad63bdf` | docs(whatsapp): topbar como unico acesso no menu de redes |
| `0619936` | fix(layout): tratar pathname nulo no shell publico |

## Commits anteriores (BATCH / bot)

| Hash | Mensagem |
|------|----------|
| `ba91793` | docs(cms): BATCH 17 auditoria staging e roteiro limpeza CMS |
| `089d889` | fix(publico): BATCH 16 mobile 375px grids propostas e transparencia |
| `cedcb0a` | feat(publico): BATCH 15 smoke projetos filhos e validar persistencia WhatsApp |
| `43c73cc` | docs(whatsapp): roteiro Meta sandbox, verify GET e log handoff |
| `d2ce460` | feat(whatsapp): Fase 3 painel admin atendimentos |
| `a2013b7` | test(whatsapp): validacao webhook E2E e smoke HTTP BATCH 14 |
| `215378d` | feat(whatsapp): Fase 2 webhook assinatura e dry-run Cloud API |
| `6304d98` | feat(whatsapp): Fase 1 motor de conversa e simulador local |
| `010b4d1` | feat(whatsapp): link wa.me e plano chatbot |
| `985e1fd` | fix(publico): BATCH 13 smoke visual propostas 404 |
| `071c52a` | docs(ops): BATCH 12 layout legado runbook |
| `4ca73fd` | fix(publico): BATCH 11 projetos publicos |
| `6a125c6` / `f919dd2` | feat(publico): BATCH 10 (duplicata — squash opcional) |
| `913e063` | feat(publico): BATCH 9 heroes padronizados |
| `7bf03c7` | feat(publico): BATCH 8 clients e observabilidade |

> **Squash opcional:** commits duplicados BATCH 10 (`6a125c6`, `f919dd2`) — só com autorização explícita (`git rebase -i`).

## Gates antes do primeiro push

**Última execução local:** `npm run validar:push-prep` → **OK** · `npm run build` → **OK** · `npm run validar:enterprise` → **OK** · `npm run validar:smoke-publico` → **OK** (15 rotas, dev em `:3001`).

```bash
npm run validar:push-prep      # código — OK
npm run build                # produção — OK
npm run validar:smoke-publico  # com npm run dev — OK (15 rotas)
npm run auditar:cms-staging    # conteúdo — exit 0 após limpeza manual
npm run validar:enterprise     # gate completo (inclui build)
```

Com `npm run dev` ativo, incluir também:

```bash
npm run validar:smoke-publico
npm run validar:whatsapp-public-chat   # pré-cadastro wa.me (site público)
npm run validar:whatsapp-public-pages  # integração nas páginas
```

## Checklist

1. [x] `npm run validar:push-prep` → OK (código)
2. [x] `npm run auditar:cms-staging` → OK (limpeza via `npm run limpar:cms-staging -- --apply`)
3. [x] `npm run build` → OK
4. [x] `npm run validar:smoke-publico` → OK (com `npm run dev`)
5. [x] `npm run validar:enterprise` → OK
6. [ ] `docs/VISUAL-GO-LIVE-CHECKLIST.md` — aceito pela equipe
7. [ ] `git status` — sem `.env.local` / `.cursor/` no stage
8. [ ] Repositório vazio no GitHub criado
9. [ ] `docs/GITHUB-PUSH.md` — `$env:GITHUB_REPO_URL` + `scripts/preparar-github-push.ps1 -Push`

## Arquivos que NUNCA devem ir no stage

- `.env.local`
- `.cursor/`
- `reports/`
- `tsconfig.tsbuildinfo`

## Verificação de stage

```powershell
git status
git diff --cached --name-only
```

## Após push

- CI: `.github/workflows/ci.yml` (`typecheck` + `build`)
- Secrets só no host de deploy
- Produção: `docs/PROD-PREP-CHECKLIST.md` (congelado)

## Referências

- CMS: `docs/CMS-LIMPEZA-STAGING.md`
- WhatsApp: `docs/WHATSAPP-META-SANDBOX.md` (sandbox depois do push)
- Mobile: `docs/FASE-PUBLICO-BATCH16.md`
