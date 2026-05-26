# Roadmap enterprise local/staging

## Estado atual

- App Next.js em `public_site`, com paginas publicas institucionais, area admin e fluxos Supabase.
- Stack atualizada para Next 16, React 19, Firebase 12, Supabase JS/SSR atuais e TypeScript 6.
- `npm audit --omit=dev` deve permanecer sem vulnerabilidades conhecidas.
- Arquivos `.env*` reais nao devem ser rastreados; use `.env.local.example` como contrato local.

## Batches concluidos nesta iteracao

1. Seguranca e estabilidade de tooling:
   - scripts `typecheck`, `validar:enterprise`, `audit:anexos`, `verify:proposta-anexos`, `check:site` e `smoke:site`;
   - headers HTTP seguros em `next.config.js`;
   - endpoint local `/api/health`;
   - boundary publico/admin e loading publico.
2. Higiene documental:
   - `.gitignore` cobre `.env*`, `.next`, `node_modules` e cache TS;
   - exemplos de ambiente Supabase documentados.
3. UX/SEO seguro:
   - logo publico aponta para asset existente;
   - sitemap inclui `/editais` e `/propostas`;
   - robots corrige bloqueio de `/login`.

## Proximos batches seguros

1. Auth admin SSR:
   - migrar login/admin/logout para `@supabase/ssr`;
   - alinhar middleware/proxy com cookies Supabase oficiais;
   - validar localmente sem alterar RLS ou producao.
2. Admin CMS:
   - padronizar clientes Supabase compartilhados;
   - substituir links admin inexistentes por modulos "Em breve" ou remover do menu apos decisao funcional.
3. Publico premium/mobile:
   - menu publico mobile colapsavel;
   - padronizar assets ausentes e imagens responsivas.

## Bloqueios explicitos

- Deploy/producao.
- Supabase Dashboard ou SQL destrutivo.
- Remocao de fallback hibrido, colunas legadas ou legado funcional sem decisao.
