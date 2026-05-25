# Roadmap enterprise local/staging

## Prioridades

1. Seguranca e estabilidade de build.
2. Integridade documental e scripts de auditoria.
3. Qualidade visual publica premium e responsividade mobile.
4. Admin/CMS local com fluxos verificaveis.
5. Observabilidade, performance e preparacao de release sem publicar.

## Estado atual

- Baseline local usa Next.js com paginas publicas e area admin no mesmo app.
- Scripts operacionais foram padronizados em `package.json`.
- Runbook local define validacoes antes de commits e release.
- Cabecalho publico e grids principais receberam ajustes responsivos locais.

## Proximos batches seguros

- Reduzir duplicacao de scripts legados em `app/scripts`.
- Revisar fluxos admin de propostas/editais com validacoes locais adicionais.
- Expandir smoke tests locais para rotas publicas apos build.
