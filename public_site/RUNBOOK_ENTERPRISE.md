# Runbook Enterprise Local/Staging

## Validacao padrao por ciclo

Execute em `public_site`:

```bash
git status --short
npx tsc --noEmit
npm run validar:enterprise
```

Quando alterar documentos ou storage:

```bash
npm run audit:anexos
npm run verify:proposta-anexos
```

Quando alterar estrutura critica, paginas publicas ou admin:

```bash
npm run build
```

Para smoke local:

```bash
npm run dev
npm run smoke:site
npm run smoke:admin
```

O smoke HTTP percorre rotas publicas a partir de `scripts/check-site.mjs` e tambem valida assets internos encontrados em `href` e `src`.
O smoke admin usa cookie sintetico `sb-access-token=local-smoke` apenas contra ambiente local.

## Regras de seguranca

- Nunca versionar `.env.local` ou variantes reais.
- Usar apenas `.env.local.example` para documentar variaveis.
- Nao executar deploy, push, operacoes em producao ou SQL destrutivo.
- Nao remover fallbacks hibridos, colunas legadas ou RLS critica sem revisao SQL.

## Variaveis locais esperadas

Veja `.env.local.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Admin local

- Rotas `/admin/:path*` exigem cookies `sb-access-token` ou `sb-refresh-token`.
- Para smoke local sem credenciais reais, usar cookie sintetico apenas no ambiente local.
- Detalhes de propostas devem expor os tres anexos persistidos: proposta, estatuto social e cartao CNPJ.

## Responsividade publica

- Classes `proposal-*` controlam o formulario publico de propostas.
- `public-info-panel` controla paineis institucionais com padding responsivo.
- O menu publico em telas pequenas usa rolagem horizontal controlada para evitar quebra visual.
