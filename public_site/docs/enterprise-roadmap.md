# Roadmap enterprise local/staging

## Prioridades ativas

1. Seguranca e estabilidade operacional.
2. Integridade documental e validacoes automatizadas.
3. Visual publico premium e responsividade mobile.
4. Admin/CMS local.
5. Observabilidade local, performance e preparacao de release sem publicar.

## Proximos batches seguros

### B1 - Qualidade operacional

- Manter `npx tsc --noEmit` e `npm run validar:enterprise` verdes.
- Manter scripts locais para auditoria de anexos e verificacao de propostas.
- Evitar alteracoes de Supabase/RLS sem SQL revisado.
- Converter avisos de anexos locais ausentes em correcoes documentais
  verificaveis, sem publicar arquivos ficticios.

### B2 - Publico premium/mobile

- Melhorar responsividade do header/menu e dos grids publicos.
- Padronizar estados de foco/hover acessiveis.
- Validar com build e smoke local.

### B3 - Admin/CMS

- Tipar entidades principais do admin.
- Padronizar cards/tabelas de listagem.
- Preservar fallbacks hibridos e colunas legadas.

### B4 - Release local

- Consolidar runbook de build/smoke.
- Documentar riscos de dependencias e preparar checklist sem deploy.
- Manter `npm audit --audit-level=moderate` zerado antes de qualquer release.
