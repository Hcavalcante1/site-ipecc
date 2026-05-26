# Roadmap Enterprise Local/Staging

## Estado atual

- Branch local/staging: `cursor/-bc-1f39505f-bee2-4dca-91ce-5571c9aba662-20fc`.
- App principal: Next.js em `public_site`.
- Produção, deploy, push e Supabase Dashboard permanecem fora de escopo sem autorização explicita.

## Batches concluídos

### 2026-05-26 - Segurança e validação operacional

- Dependências diretas atualizadas para versões atuais.
- Override de `postcss` aplicado para manter `npm audit --omit=dev` sem vulnerabilidades conhecidas.
- Scripts enterprise adicionados: typecheck, validação integrada, auditoria de anexos, verificação de anexos de propostas, health local e smokes HTTP.
- Endpoint local de health adicionado em `/api/health`.
- `tsconfig` ajustado para TypeScript 6.

### 2026-05-26 - Autenticação admin local/staging

- Login admin alinhado para `/api/admin/login`, com cookies HTTP-only usados pelo `proxy.ts`.
- Logout server-side adicionado em `/api/admin/logout`.
- Layout admin deixou de depender de sessão client-side Supabase para evitar loop pos-login.

### 2026-05-26 - Smoke publico e asset institucional

- Smoke publico atualizado para rotas existentes e decodificacao de entidades HTML.
- Logo do cabecalho ajustado para asset SVG versionado existente.
- Smokes locais de health, admin e site executados com servidor Next local.

## Próximos batches seguros

1. Melhorar responsividade do header/menu publico e formularios mobile.
2. Padronizar clientes Supabase com guardas de ambiente para build local/staging.
3. Revisar fluxo documental/storage sem alterar RLS nem dados.

## Bloqueios permanentes sem autorização

- Push, deploy ou publicação.
- Operações em produção.
- SQL destrutivo, `DROP`, apagamento de dados ou remoção de legado.
- Alterações criticas de RLS sem SQL revisado.
