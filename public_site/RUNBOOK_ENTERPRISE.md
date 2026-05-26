# Runbook Enterprise Local/Staging

## Escopo operacional

Este runbook cobre operacoes seguras no app Next.js em `public_site`, somente em ambiente local/staging.
Nao executar deploy, Supabase producao, SQL destrutivo, `DROP`, remocao de dados ou alteracoes de chaves reais sem revisao explicita.

## Validacao padrao por ciclo

Executar a partir de `public_site`:

```bash
git status --short
npx tsc --noEmit
npm run validar:enterprise
```

Quando houver mudanca em paginas publicas/admin, executar smoke local:

```bash
npm run dev
npm run smoke:site
```

Quando houver mudanca documental/storage/anexos, executar tambem:

```bash
npm run audit:anexos
npm run verify:proposta-anexos
```

## Baseline validado

- TypeScript: `npx tsc --noEmit`
- Enterprise: `npm run validar:enterprise`
- Build: `next build` via Next.js 16
- Smoke HTTP local: `npm run smoke:site`
- Auditoria npm: `npm audit --audit-level=moderate` sem vulnerabilidades conhecidas

## Guard admin

O bloqueio de `/admin/:path*` usa a convencao `proxy.ts` do Next.js 16.
O comportamento atual redireciona para `/login` quando nao ha cookies `sb-access-token` ou `sb-refresh-token`.

## Limites de seguranca

- Nao publicar em producao a partir deste ambiente.
- Nao alterar RLS critica sem SQL revisado.
- Nao remover fallback hibrido, colunas legadas ou dados persistidos.
- Nao ativar modos exclusivos de tabela em producao sem decisao funcional.
