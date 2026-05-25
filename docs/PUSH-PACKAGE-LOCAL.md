# Pacote local — pronto para push (quando autorizar)

**Data:** 2026-05-25 · **Branch:** `master` · **Remote:** nenhum configurado

## Estado do repositório

```text
Branch: master
Remote: (vazio — não executar push sem autorização)
Working tree limpo para código (após commit BATCH 13)
Não commitar: .env.local, tsconfig.tsbuildinfo, .cursor/
```

## Commits prontos para publicar (ordem cronológica recente)

| Hash | Mensagem |
|------|----------|
| `071c52a` | docs(ops): BATCH 12 layout legado runbook e validar admin |
| `4ca73fd` | fix(publico): BATCH 11 projetos publicos edital hero e observabilidade admin |
| `6a125c6` / `f919dd2` | feat(publico): BATCH 10 home transparencia propostas heroes (duplicata local — considerar squash no push) |
| `913e063` | feat(publico): BATCH 9 heroes padronizados e mobile publico |
| `7bf03c7` | feat(publico): BATCH 8 clients, observabilidade e mobile base |
| `31f5dc2` | docs: README, guia GitHub push e runbook enterprise |
| `78586af` | fix(security): insert proposta sem SELECT anon e sync por email |
| `b68011b` | docs(security): SQL aplicavel RLS propostas |
| `417e5c3` | chore(security): hardening RLS checklist e validar:seguranca |
| `6f4b46f` | docs(ops): prod prep checklist e gate validar:release-prep |
| … | Ver `git log --oneline` completo |

> **Nota:** há dois commits BATCH 10 consecutivos (`6a125c6`, `f919dd2`). Antes do push, avaliar `git rebase -i` para squash **somente se a equipe autorizar** reescrita de histórico.

## Antes do primeiro push

1. [ ] `npm run validar:enterprise` → OK
2. [ ] `npm run auditar:cms-staging` → OK (sem teste publicado)
3. [ ] `docs/VISUAL-GO-LIVE-CHECKLIST.md` — ressalvas de conteúdo resolvidas ou aceitas
4. [ ] `git status` — sem `.env.local` no stage
5. [ ] Criar repositório vazio no GitHub
6. [ ] Seguir `docs/GITHUB-PUSH.md` (adicionar `origin` + push)

## Arquivos que NUNCA devem ir no stage

- `.env.local`
- `.cursor/`
- `reports/` (se gerados)
- `tsconfig.tsbuildinfo` (opcional no `.gitignore`; hoje pode aparecer modificado localmente)

## Verificação rápida de stage

```powershell
git status
git diff --cached --name-only
# Deve listar apenas código/docs intencionais
```

## Após push (futuro)

- CI: `.github/workflows/ci.yml` (`typecheck` + `build`)
- Secrets de produção no host de deploy, não no repositório
- Produção: `docs/PROD-PREP-CHECKLIST.md` (ainda congelado)
