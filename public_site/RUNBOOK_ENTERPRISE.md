# Runbook Enterprise Local/Staging

## Validação obrigatória por ciclo local

```bash
git status --short
npx tsc --noEmit
npm run validar:enterprise
npm run build
```

Quando houver alteração documental/storage:

```bash
npm run audit:anexos
npm run verify:proposta-anexos
```

Quando houver alteração em página pública/admin:

```bash
npm run dev
npm run smoke:site
npm run smoke:admin
npm run health:local
```

Se `npm run build` for executado enquanto o servidor dev está ativo, reinicie o dev
server antes dos smokes. O Next pode reaproveitar artefatos `.next` de produção e
gerar HTTP 500 temporário no dev até o restart.

## Interpretação dos scripts

- `validar:enterprise`: checa scripts obrigatórios, impede `.env*` reais versionados, executa typecheck, auditoria npm high/critical e verifica anexos de propostas.
- `audit:anexos`: audita extensões em `public/docs` e avisa sobre links `/docs/*` sem arquivo local.
- `verify:proposta-anexos`: verifica estaticamente upload de anexos PDF no fluxo de propostas.
- `health:local`: consulta `GET /api/health` no servidor local.
- `smoke:site` e `smoke:admin`: exigem servidor local ativo em `http://localhost:3000`.

## Guardrails

- Não commitar `.env`, `.env.local` ou chaves reais.
- Não executar push/deploy sem autorização explícita.
- Não executar SQL destrutivo, DROP, remoção de dados ou alteração crítica de RLS nesta automação.
- Não fabricar documentos institucionais reais; usar somente arquivos fornecidos ou placeholders explicitamente aprovados.
