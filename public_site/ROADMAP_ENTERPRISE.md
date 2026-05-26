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

## Proximos batches seguros

1. Visual publico premium:
   - Revisar home, quem somos, projetos, editais e transparencia.
   - Consolidar tokens visuais em `app/globals.css`.
   - Melhorar hierarquia mobile sem alterar conteudo institucional sensivel.

2. Responsividade mobile:
   - Auditar header fixo, menu principal, cards e tabelas.
   - Reduzir overflow horizontal em paginas admin e publicas.

3. Admin/CMS local:
   - Padronizar estados de loading, erro e sucesso.
   - Reutilizar componentes de formulario/tabela quando houver repeticao segura.

4. Observabilidade local:
   - Ampliar smoke para cobrir rotas admin publicamente acessiveis sem credenciais.
   - Registrar falhas por tipo com saida mais objetiva para CI/staging.

5. Preparacao de release sem publicar:
   - Manter audit e build limpos.
   - Documentar variaveis obrigatorias sem expor segredos.
   - Gerar checklist pre-release local/staging.

## Bloqueios que exigem decisao

- Alteracoes de RLS ou SQL destrutivo.
- Remocao de legado persistido.
- Deploy, git push manual para branch nao autorizada ou acao em producao.
- Mudancas de produto que alterem fluxo funcional de propostas, editais ou anexos.
