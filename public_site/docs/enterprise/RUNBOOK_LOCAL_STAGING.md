# Runbook local/staging - IPECC

Runbook para operacao segura em ambiente local/staging. Nao executar passos de producao a partir deste documento.

## Regras de seguranca

- Nao usar chaves reais em arquivos versionados.
- Nao executar deploy, alteracao em producao ou comandos SQL destrutivos.
- Nao remover legado nem fallback hibrido sem plano documentado.
- Nao ativar modos restritivos em producao, incluindo `SOMENTE_TABELA`, por automacao.
- Antes de cada batch, verificar `git status --short` e registrar a decisao.

## Validacao minima por batch

```bash
npx tsc --noEmit
npm run validar:enterprise
```

Quando houver mudanca em documental, storage ou anexos:

```bash
npm run audit:anexos
npm run verify:proposta-anexos
```

Quando houver mudanca estrutural ou de build:

```bash
npm run build
```

Quando houver mudanca visual, publica ou admin:

```bash
npm run dev
npm run check:http
```

## Fluxo operacional seguro

1. Conferir branch e estado:

   ```bash
   git status --short
   git branch --show-current
   ```

2. Escolher um batch pequeno ou medio conforme prioridades enterprise.
3. Executar alteracoes sem tocar em producao, dados reais ou RLS critica.
4. Rodar validacoes aplicaveis.
5. Corrigir regressao local quando for segura.
6. Commitar com mensagem tematica.

## Anexos e propostas

Invariantes locais que devem permanecer validos:

- O formulario publico de propostas aceita PDFs para proposta, estatuto e CNPJ.
- O upload usa Supabase Storage no bucket/namespace de propostas.
- O admin lista propostas e gera links publicos para anexos persistidos.
- Auditorias automatizadas devem falhar se sinais essenciais forem removidos.

## Ambiente e chaves

- Usar somente placeholders em documentacao.
- `.env.local` pode existir localmente, mas nao deve ser versionado.
- Variaveis publicas esperadas para Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Resposta a falhas

- Falha TypeScript: corrigir tipos locais sem alterar contrato de dados.
- Falha de anexos: revisar `app/propostas/page.tsx` e admin de propostas antes de mexer em storage.
- Falha de build: isolar pagina ou dependencia alterada e reexecutar `npx tsc --noEmit`.
- Falha visual/admin: executar smoke local e preservar conteudo institucional aprovado.
