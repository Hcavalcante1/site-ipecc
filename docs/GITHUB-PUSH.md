# Publicar repositório no GitHub

> Pacote consolidado: `docs/PUSH-PACKAGE-LOCAL.md` (branch, commits, arquivos proibidos no stage).

## Pré-requisitos

- `npm run validar:enterprise` → OK
- `docs/VISUAL-GO-LIVE-CHECKLIST.md` — ressalvas de conteúdo revisadas ou aceitas pela equipe
- Conta GitHub com repositório vazio criado
- **Não** incluir `.env.local`, `.cursor/`, `reports/` no commit

## Comandos

```powershell
cd C:\Users\helio\Downloads\public_site_v3_heroes_padronizados_corrigido

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
