# Roadmap operacional local/staging

Prioridades do ciclo autonomo:
1. Seguranca e estabilidade das validacoes locais.
2. Integridade documental e runbooks.
3. Visual publico premium e responsividade.
4. Admin/CMS local.
5. Observabilidade e performance.
6. Preparacao de release sem publicar.

## Backlog seguro

- [x] Desbloquear `npx tsc --noEmit` no ambiente local.
- [x] Corrigir falha TypeScript em admin/editais/documentos.
- [x] Registrar runbook operacional inicial.
- [ ] Adicionar scripts locais de validacao enterprise/smoke sem dependencia de producao.
- [ ] Melhorar responsividade do cabecalho publico em telas pequenas.
- [ ] Revisar paginas publicas para consistencia visual e acessibilidade basica.
- [ ] Documentar checklist de release staging sem deploy.

## Bloqueios permanentes sem autorizacao explicita

- Deploy ou publicacao.
- Uso de producao ou Supabase Dashboard.
- SQL destrutivo, DROP ou remocao de dados.
- Remocao de fallbacks hibridos ou colunas legadas.
- Alteracoes em secrets/envs reais.
