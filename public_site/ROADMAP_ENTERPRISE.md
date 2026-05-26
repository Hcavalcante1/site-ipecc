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

## Próximos batches seguros

1. Corrigir autenticação admin para usar cookies HTTP-only via API de login/logout.
2. Melhorar responsividade do header/menu publico e formularios mobile.
3. Padronizar clientes Supabase com guardas de ambiente para build local/staging.
4. Executar smokes locais com servidor Next ativo.
5. Revisar fluxo documental/storage sem alterar RLS nem dados.

## Bloqueios permanentes sem autorização

- Push, deploy ou publicação.
- Operações em produção.
- SQL destrutivo, `DROP`, apagamento de dados ou remoção de legado.
- Alterações criticas de RLS sem SQL revisado.
