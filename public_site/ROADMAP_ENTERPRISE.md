# Roadmap Enterprise Local/Staging

## Baseline atual

- Branch operacional: `cursor/avan-o-roadmap-enterprise-14a5`.
- Ambiente permitido: local/staging.
- Proibido nesta automação: push, deploy, produção, alterações destrutivas de banco, remoção de legado/fallback.

## Batches concluídos nesta iteração

1. Validação local restaurada:
   - dependências instaláveis com `package-lock.json`;
   - `typecheck` executável via `npx tsc --noEmit`;
   - scripts `validar:enterprise`, `audit:anexos`, `verify:proposta-anexos`, `health:local`, `smoke:site` e `smoke:admin`.
2. Segurança:
   - Next atualizado para linha 15.5.x;
   - Firebase atualizado para linha 12.x;
   - auditoria enterprise bloqueia vulnerabilidades high/critical.
3. Admin/CMS:
   - corrigido export duplicado em `app/admin/editais/documentos/page.tsx`.
4. Observabilidade:
   - endpoint local `GET /api/health`.
5. Validação:
   - `npx tsc --noEmit`, `npm run validar:enterprise`, `npm run audit:anexos`,
     `npm run verify:proposta-anexos`, `npm run build`, `npm run smoke:site`,
     `npm run smoke:admin` e `npm run health:local` executados com sucesso.

## Próximos batches seguros

1. Corrigir warnings de build/smoke sem tocar em produção.
2. Padronizar responsividade pública em páginas internas (`quem-somos`, `projetos`, `editais`, `transparencia`, `contato`).
3. Consolidar clientes Supabase duplicados em helper local, preservando comportamento híbrido.
4. Melhorar UX admin em telas com formulários inline, mantendo contratos de tabela existentes.
5. Preparar checklist de release staging sem executar deploy.

## Bloqueios conhecidos

- Publicação/deploy depende de autorização explícita.
- Mudanças de RLS, DROP, remoção de colunas legadas ou ativação de modo somente tabela exigem revisão SQL fora desta automação.
- Documentos reais em `public/docs` não devem ser fabricados; a auditoria reporta links sem arquivo local como aviso.
