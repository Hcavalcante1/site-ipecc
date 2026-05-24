# Publicar repositório no GitHub

## Pré-requisitos

- `npm run validar:enterprise` → OK
- Conta GitHub com repositório vazio criado

## Comandos

```powershell
cd C:\Users\helio\Downloads\public_site_v3_heroes_padronizados_corrigido

git remote add origin https://github.com/SEU_USUARIO/ipecc-public-site.git
git push -u origin master
```

## Após o push

1. GitHub → **Actions** → workflow **CI** deve ficar verde (`typecheck` + `build`)
2. Secrets de produção ficam no host de deploy (Vercel etc.), não no Actions
3. Atualizar `docs/ENTERPRISE-STATUS.md` com URL do repositório (opcional)

## Não incluir no Git

- `.env.local` (já no `.gitignore`)
- `reports/` (auditorias locais)
- `.cursor/`
