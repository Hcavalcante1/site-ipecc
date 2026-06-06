# Checklist de seguranca para go-live

## Objetivo

Checklist final para validar seguranca operacional do site IPECC antes de declarar producao estavel.

Este documento nao executa SQL e nao altera ambiente.

## Estado validado no codigo

### Admin e sessao

- Rotas admin usam validacao de sessao.
- APIs admin criticas usam `verifyAdminSession`.
- Sessao admin valida usuario Supabase e permissao via `is_admin`.
- Logout existe em `/api/logout`.
- O acesso admin nao deve ser tratado como pagina publica.

### APIs admin

Rotas verificadas:

- `/api/admin/mutate`
- `/api/admin/storage/upload`
- `/api/admin/governanca/[id]`

Controles existentes:

- exige sessao admin;
- usa service role somente no servidor;
- limita tabelas permitidas no proxy de mutacao;
- bloqueia update/delete sem filtro;
- aceita apenas operador `eq` nos filtros;
- revalida paginas afetadas por tabela;
- nao deve retornar secrets.

### Upload/storage

Controles existentes:

- buckets permitidos: `docs`, `editais`, `propostas`, `media`;
- limite de upload: 20MB;
- bloqueio de path traversal;
- bloqueio de caminho absoluto;
- validacao de extensao por bucket;
- validacao de MIME quando informado;
- PDFs de editais ficam no bucket `editais`;
- documentos de governanca ficam no bucket `docs`;
- propostas ficam no bucket `propostas`.

### Download

Controles esperados:

- documentos publicos usam `/api/download/docs/...`;
- editais publicos usam `/api/download/editais/...`;
- anexos de propostas exigem acesso admin;
- bucket `propostas` nao deve ser publico.

## Pontos que precisam estar confirmados no Supabase

### Tabelas criticas

Confirmar RLS ativa em:

- `propostas`;
- `proposta_anexos`;
- `documentos_publicos`;
- `editais_logs`;
- `admin_logs`;
- `logs_atividade`;
- tabelas sensiveis de contato/leads, se existirem.

### Politicas esperadas

`propostas`:

- anon pode apenas inserir proposta publica;
- anon nao pode listar propostas;
- admin pode listar, atualizar e excluir;
- service role pode operar pelo backend.

`proposta_anexos`:

- anon pode registrar anexos apenas no fluxo publico previsto;
- anon nao pode listar anexos;
- admin pode listar.

`documentos_publicos`:

- publico pode ler apenas `publicado = true`;
- escrita deve ocorrer via admin/backend.

`editais_logs`:

- publico nao deve ler;
- anon nao deve escrever;
- uso operacional deve ser admin/backend.

### Storage

Confirmar buckets:

- `editais`: leitura publica permitida se os PDFs oficiais forem publicos;
- `docs`: leitura publica permitida apenas para documentos institucionais publicados;
- `media`: leitura publica permitida para imagens publicas;
- `propostas`: privado/admin only.

## SQLs de referencia ja existentes

Nao executar automaticamente. Revisar e aplicar manualmente quando necessario:

- `docs/sql/governanca-editais-fase-1-APLICAR.sql`
- `docs/sql/hardening-propostas-rls-APLICAR.sql`
- `docs/sql/rls-hardening-admin-only.sql`
- `docs/sql/rls-hardening-bloco-1-critico.sql`
- `docs/sql/rls-hardening-bloco-2-conteudo-logs.sql`

## Testes obrigatorios antes de go-live definitivo

### Publico

- abrir `/`;
- abrir `/inicio`;
- abrir `/editais`;
- abrir `/transparencia`;
- abrir `/propostas`;
- baixar PDF publico de edital;
- abrir documento publico de transparencia.

### Admin

- acessar `/login`;
- acessar `/admin`;
- tentar abrir `/admin` apos sair da sessao;
- criar/editar/excluir registro de teste;
- publicar documento de governanca;
- excluir documento de teste;
- validar que rascunho nao aparece na Transparencia.

### Propostas

- enviar proposta de teste vinculada a edital aberto;
- validar anexos no admin;
- confirmar que anexo baixa no detalhe admin;
- excluir proposta de teste, se aplicavel.

## Riscos restantes

### Medio

- RLS depende de confirmacao no Supabase, nao apenas do codigo.
- Policies antigas podem conflitar se nao forem revisadas.
- Bucket `docs` pode conter documentos sensiveis se usado de forma incorreta.

### Baixo

- Mensagens de erro ainda podem conter texto tecnico do Supabase.
- Arquivos locais antigos continuam sujos fora do Git.

## Criterio de pronto para producao estavel

Considerar pronto quando:

- build passar;
- typecheck passar;
- admin exigir login corretamente;
- rascunho nao aparecer no publico;
- proposta publica funcionar;
- anexos de proposta ficarem protegidos;
- documentos publicos abrirem;
- Search Console aceitar sitemap;
- RLS e buckets forem conferidos no Supabase.

