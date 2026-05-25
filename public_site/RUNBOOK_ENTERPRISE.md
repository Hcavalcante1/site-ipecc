# Runbook enterprise local/staging

Este runbook orienta ciclos autonomos no ambiente local/staging do site IPECC/APECC.

## Limites de seguranca

- Nao executar deploy, push, acoes em producao ou Supabase Dashboard sem autorizacao explicita.
- Nao executar SQL destrutivo, `DROP`, remocao de dados, remocao de fallbacks hibridos ou alteracao critica de RLS sem revisao.
- Preferir batches pequenos, coerentes e validados antes de commit.

## Ciclo padrao

1. Diagnosticar estado atual com `git status --short`.
2. Escolher um batch local seguro.
3. Implementar.
4. Validar:
   - `npx tsc --noEmit` quando o shim local estiver executavel.
   - `npm run typecheck` como fallback reprodutivel via `node`.
   - `npm run validar:enterprise` quando a mudanca afetar estrutura critica.
   - `npm run build` quando alterar paginas, layout, middleware, dependencias ou configuracao.
   - `npm run audit:anexos` e `npm run verify:proposta-anexos` quando o batch tocar documental/storage/anexos.
   - `npm run smoke:http` com o servidor local em `http://localhost:3050` quando paginas publicas/admin forem alteradas.
   - `npm run smoke:health` com o servidor local em `http://localhost:3050` para validar observabilidade basica.
5. Corrigir regressao local detectada.
6. Commitar com escopo claro.

## Observacoes de ambiente

- O workspace pode conter `node_modules/.bin/tsc` sem permissao de execucao. Nesse caso, rodar `chmod +x node_modules/.bin/tsc node_modules/typescript/bin/tsc` localmente ou usar `npm run typecheck`.
- `npm audit` ainda aponta vulnerabilidades que exigem upgrade breaking para Next 16 e Firebase 12. Esse salto deve ser tratado como batch proprio, com validacao funcional ampla.

