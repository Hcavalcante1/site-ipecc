# Publicar repositório no GitHub

> Pacote consolidado: `docs/PUSH-PACKAGE-LOCAL.md` (branch, commits, gates).

## Pré-requisitos

- `npm run validar:push-prep` → OK
- `npm run validar:enterprise` → OK (recomendado antes do push)
- `npm run auditar:cms-staging` → OK (conteúdo staging limpo)
- Conta GitHub com repositório vazio criado
- **Não** incluir `.env.local`, `.cursor/`, `reports/` no commit

## Passo 1 — preparar (PowerShell)

O `gh` não é obrigatório. Use o script do repositório:

```powershell
cd C:\Users\helio\Downloads\public_site_v3_heroes_padronizados_corrigido

# 1) Crie repo vazio no GitHub (sem README) e copie a URL HTTPS
$env:GITHUB_REPO_URL = "https://github.com/SEU_USUARIO/ipecc-public-site.git"

# 2) Valida stage e registra remote
.\scripts\preparar-github-push.ps1

# 3) Enviar (somente quando autorizado)
.\scripts\preparar-github-push.ps1 -Push
```

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

## Não incluir no Git

- `.env.local` (já no `.gitignore`)
- `reports/` (auditorias locais)
- `.cursor/`
