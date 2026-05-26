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
4. Compatibilidade Next/admin:
   - middleware migrado para `proxy.ts` no padrao Next 16;
   - links admin de Noticias, Eventos, Banners e Galeria agora possuem paginas "Em breve" em vez de 404.
5. Responsividade publica:
   - menu publico mobile acessivel via `details/summary`;
   - ajustes de topo, logo e espacamento para telas pequenas.
6. Auth admin local/staging:
   - login usa `/api/admin/login` para criar cookies HTTP-only;
   - logout usa `/api/admin/logout` para limpar cookies;
   - layout admin confia na protecao da `proxy.ts`, eliminando checagem client-side divergente.

## Proximos batches seguros

1. Auth admin SSR:
   - considerar migracao futura para `@supabase/ssr` com cookies Supabase oficiais;
   - validar localmente sem alterar RLS ou producao.
2. Admin CMS:
   - padronizar clientes Supabase compartilhados;
   - evoluir modulos "Em breve" para CMS somente apos staging Supabase e politicas revisadas.
3. Publico premium/mobile:
   - padronizar assets ausentes e imagens responsivas.

## Bloqueios explicitos

- Deploy/producao.
- Supabase Dashboard ou SQL destrutivo.
- Remocao de fallback hibrido, colunas legadas ou legado funcional sem decisao.
