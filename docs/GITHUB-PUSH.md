# Publicar repositório no GitHub

> Pacote consolidado: `docs/PUSH-PACKAGE-LOCAL.md` (branch, commits, gates).

## Pré-requisitos

- `npm run validar:push-prep` → OK
- `npm run validar:enterprise` → OK (recomendado antes do push)
- `npm run auditar:cms-staging` → OK (conteúdo staging limpo)
- Conta GitHub com repositório vazio criado
- **Não** incluir `.env.local`, `.cursor/`, `reports/` no commit

## Passo 1 — push (PowerShell)

Script principal: **`scripts/push-prep.ps1`**

```powershell
cd C:\Users\helio\Downloads\public_site_v3_heroes_padronizados_corrigido
Set-ExecutionPolicy -Scope Process Bypass

# Dry-run (valida remote, não envia)
.\scripts\push-prep.ps1 -RemoteUrl "https://github.com/Hcavalcante1/ipecc-whatsapp-leads.git"

# Enviar (GitHub usa branch main por padrão)
.\scripts\push-prep.ps1 -RemoteUrl "https://github.com/Hcavalcante1/ipecc-whatsapp-leads.git" -Push -UseMain
```

Legado (env var): `scripts/preparar-github-push.ps1` com `$env:GITHUB_REPO_URL`.

## Comandos manuais (alternativa)

```powershell
git status
git log --oneline -5
git remote add origin https://github.com/SEU_USUARIO/ipecc-public-site.git
git push -u origin master
```

**Antes do `git push`:** confirme que o stage está vazio de segredos (`git diff --cached`).

## Após o push

1. GitHub → **Actions** → workflow **CI** deve ficar verde (`typecheck` + `build`)
2. Secrets de produção ficam no host de deploy (Vercel etc.), não no Actions
3. Atualizar `docs/ENTERPRISE-STATUS.md` com URL do repositório (opcional)

## Cursor Automation (Enterprise Guard)

O composer na nuvem usa o **GitHub remoto** conectado no painel — não a pasta local.

| Item | Valor |
|------|--------|
| Repositório do automation | **`Hcavalcante1/site-ipecc`** (branch `main`) |
| Repositório local / push prep | `Hcavalcante1/ipecc-whatsapp-leads` |
| `.cursorignore` | Deve existir em **ambos** se houver dois remotes |

Commit em `site-ipecc/main`: `cf69a17` — `.cursorignore` na raiz.

Se o Run Test falhar com `resource_exhausted`: aguarde 10–15 min, feche outros Background Agents, confirme repo **`site-ipecc`** / branch **`main`**, e tente de novo. Automation: `e1026493-c440-4fd3-8896-7de19ce4699b`.

## Não incluir no Git

- `.env.local` (já no `.gitignore`)
- `reports/` (auditorias locais)
- `.cursor/`
