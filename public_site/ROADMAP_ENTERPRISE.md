# Roadmap Enterprise Local/Staging

## Concluido nesta base

- Baseline de validacao restaurado com scripts `typecheck`, `validar:enterprise`, `smoke:site`, `audit:anexos` e `verify:proposta-anexos`.
- Build corrigido no admin de documentos removendo export default duplicado.
- Dependencias principais atualizadas para baseline com audit npm zerado:
  - Next.js 16
  - React/React DOM 19
  - Firebase 12
  - react-chartjs-2 compativel com React 19
  - override de PostCSS corrigido
- Guard admin migrado de `middleware.ts` para `proxy.ts`.
- Smoke local ajustado para rotas reais e URLs HTML escapadas.
- Visual publico recebeu refinamento responsivo de baixo risco em tokens, cards, hero, foco acessivel e header mobile.
- Admin recebeu ajuste mobile para manter navegacao acessivel e reduzir overflow de tabelas/formularios.
- Smoke local passou a cobrir propostas/login, aplicar timeout por requisicao e deduplicar falhas repetidas.

## Proximos batches seguros

1. Responsividade mobile:
   - Auditar paginas com grids inline de duas colunas.
   - Reduzir overflow horizontal residual em formularios especificos.

2. Admin/CMS local:
   - Padronizar estados de loading, erro e sucesso.
   - Reutilizar componentes de formulario/tabela quando houver repeticao segura.

3. Observabilidade local:
   - Ampliar smoke para cobrir redirecionamentos admin sem credenciais.
   - Avaliar exportacao JSON opcional para CI/staging.

4. Preparacao de release sem publicar:
   - Manter audit e build limpos.
   - Documentar variaveis obrigatorias sem expor segredos.
   - Gerar checklist pre-release local/staging.

## Bloqueios que exigem decisao

- Alteracoes de RLS ou SQL destrutivo.
- Remocao de legado persistido.
- Deploy, git push manual para branch nao autorizada ou acao em producao.
- Mudancas de produto que alterem fluxo funcional de propostas, editais ou anexos.
