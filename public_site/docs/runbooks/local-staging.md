# Runbook Local/Staging IPECC

Runbook para evolucao segura do projeto em ambiente local ou staging. Nao cobre deploy, producao, Supabase Dashboard ou SQL destrutivo.

## Pre-flight obrigatorio

1. Confirmar branch:
   ```bash
   git branch --show-current
   ```
2. Confirmar estado limpo ou entender alteracoes existentes:
   ```bash
   git status --short
   ```
3. Escolher batch pequeno ou medio, priorizando segurança, estabilidade e documentacao.
4. Se o batch tocar publico/admin/visual, planejar smoke em navegador.
5. Se o batch tocar documental/storage/anexos, rodar as auditorias especificas existentes antes do commit.

## Validacao padrao por batch

```bash
npx tsc --noEmit
npm run validar:enterprise
```

Use tambem:

```bash
npm run build
```

quando houver mudanca em rotas, layouts, configuracao Next.js, componentes compartilhados ou estrutura critica.

## Smoke local publico/admin

1. Iniciar aplicacao local:
   ```bash
   npm run dev
   ```
2. Verificar paginas publicas principais:
   - `/`
   - `/quem-somos`
   - `/projetos`
   - `/editais`
   - `/propostas`
   - `/transparencia`
   - `/contato`
3. Verificar admin sem alterar dados:
   - `/admin`
   - `/admin/propostas`
4. Se houver build/export estatico aplicavel, usar:
   ```bash
   node scripts/check-site.mjs --http http://localhost:3000
   ```

## Regras de seguranca

- Nao executar `DROP`, `TRUNCATE` ou migracoes destrutivas.
- Nao alterar producao nem publicar deploy.
- Nao editar chaves reais ou valores sensiveis.
- Nao remover fallback hibrido ou compatibilidade legado sem plano aprovado.
- Nao apagar dados ou buckets.

## Fluxo de commit

1. Rodar validacoes aplicaveis.
2. Revisar diff:
   ```bash
   git diff --check
   git diff --stat
   ```
3. Commitar por tema:
   ```bash
   git add <arquivos>
   git commit -m "mensagem objetiva"
   ```

## Quando parar para decisao externa

- Risco irreversivel.
- Producao, deploy ou painel Supabase.
- SQL destrutivo.
- Decisao de produto ou conteudo institucional ambigua.
