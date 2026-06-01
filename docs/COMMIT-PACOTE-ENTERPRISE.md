# Pacote de commit — enterprise + Fase 4 (local)

Gerado após `npm run evolucao:segura:http` OK.

## Não commitar

- `.env.local` (secrets e template WhatsApp)
- `reports/` (gitignore)

## Incluir no commit

### Docs

- `docs/ENTERPRISE-OPERACAO-QUICKSTART.md` (novo)
- `docs/FASE4-WHATSAPP-RUNBOOK.md` (novo)
- `docs/ENTERPRISE-GUARD-LOCAL.md`
- `docs/ENTERPRISE-STATUS.md`
- `docs/EVOLUCAO-PASSOS.md`
- `docs/PUSH-PACKAGE-LOCAL.md`
- `docs/WHATSAPP-META-SANDBOX.md`
- `docs/GITHUB-PUSH.md` (se alterações forem intencionais)

### Scripts (novos)

- `scripts/atualizar-status-fase4-whatsapp.ts`
- `scripts/coletar-evidencias-whatsapp-meta.ps1`
- `scripts/coletar-reports-whatsapp-meta.ts`
- `scripts/diagnostico-enterprise-operacao.ps1`
- `scripts/diagnostico-fase4-whatsapp-meta.ts`
- `scripts/executar-fase4-whatsapp-meta.ps1`
- `scripts/gerar-resumo-whatsapp-meta-evidencias.ts`
- `scripts/preparar-env-whatsapp-meta.ts`
- `scripts/sincronizar-checklist-fase4-status.ts`
- `scripts/validar-dod-whatsapp-meta.ts`
- `scripts/validar-enterprise-ops.ts`
- `scripts/validar-enterprise-readiness.ts`
- `scripts/validar-env-whatsapp-meta.ts`
- `scripts/validar-status-fase4-whatsapp.ts`
- `scripts/validar-whatsapp-handoff-fase4.ts`
- `scripts/validar-whatsapp-meta-real-preflight.ts`
- `scripts/verificar-enterprise-guard-agendamento.ps1`

### Scripts (alterados)

- `scripts/agendar-enterprise-guard.ps1`
- `scripts/enterprise-guard-local.ps1`
- `scripts/enterprise-guard-local.ts`
- `scripts/validar-enterprise-staging.ts`
- `scripts/validar-public-pages-padrao.ts`
- `scripts/validar-push-prep.ts`
- `scripts/validar-whatsapp-webhook-http.ts`

### App (revisar diff antes — mudanças de padronização)

- `app/projetos/page.tsx` (`.projetos-eixos`)
- `app/globals.css` (classe `.projetos-eixos`)
- `app/editais/page.tsx` (conferir se diff é só o esperado)

### package.json

- Novos scripts npm (`evolucao:segura`, Fase 4, readiness, etc.)

## Mensagem de commit sugerida

```
feat(ops): trilha enterprise Fase 4 com gates, DoD e evolução segura

Adiciona automação local (guard, reports UTF-8, readiness, preflight Meta),
documentação operacional e validadores WhatsApp sandbox. Padronização leve em projetos.
```

## Comandos (PowerShell)

```powershell
# Conferir que .env.local NÃO está staged
git status

git add docs/ scripts/ package.json app/projetos/page.tsx app/globals.css
# Incluir app/editais/page.tsx só se o diff for o esperado:
git add app/editais/page.tsx

git diff --cached --stat
# git commit -m "feat(ops): trilha enterprise Fase 4 com gates, DoD e evolução segura"
```

## Após o commit

1. `git push` conforme `docs/GITHUB-PUSH.md`
2. Etapa 8: credenciais Meta reais + `validar:whatsapp-meta-real-preflight`
3. Etapa 10: homologação visual (equipe)
