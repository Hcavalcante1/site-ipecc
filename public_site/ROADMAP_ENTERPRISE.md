# Roadmap Enterprise Local/Staging

## Estado atual

- App principal: Next.js em `public_site`.
- Baseline local atualizado para Next/React/TypeScript atuais.
- `npm audit --omit=dev` limpo com override de PostCSS corrigido.
- TypeScript validado com `npx tsc --noEmit`.
- Arquivos reais `.env.local` devem permanecer apenas locais e fora do Git.

## Batches concluidos neste ciclo

1. Seguranca e estabilidade de dependencias.
   - Atualizacao de Next, React, Supabase, Firebase e TypeScript.
   - `package-lock.json` criado para reprodutibilidade local/staging.
2. Correcao admin/CMS.
   - Removido export default duplicado em `app/admin/editais/documentos/page.tsx`.
3. Validacoes enterprise locais.
   - Scripts de typecheck, auditoria documental, verificacao de anexos de propostas e validacao enterprise.
4. Higiene operacional.
   - `.gitignore` cobre envs reais, build outputs, cache TypeScript e `node_modules`.
   - `.env.local.example` documenta variaveis esperadas.
5. Smoke HTTP local.
   - Crawler local valida rotas publicas principais e decodifica atributos HTML escapados gerados pelo Next.

## Proximos batches seguros

1. Rodar `npm run build` e corrigir incompatibilidades do Next 16.
2. Migrar `middleware.ts` para `proxy.ts` se o build emitir bloqueio/deprecacao forte.
3. Melhorar responsividade dos formularios publicos de editais/propostas.
4. Expandir smoke local para rotas admin com cookie local de sessao.
5. Padronizar componentes visuais publicos, priorizando menu mobile e cards.

## Bloqueios de producao

- Sem deploy.
- Sem push.
- Sem Supabase Dashboard.
- Sem DROP, remocao de colunas legadas ou alteracao destrutiva de dados.
