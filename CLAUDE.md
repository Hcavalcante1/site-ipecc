# IPECC — site institucional + painel administrativo

Next.js 14 (App Router) + TypeScript + Supabase. Site público (`app/*`) e painel
administrativo (`app/admin/*`) no mesmo projeto.

## Comandos

```bash
npm run typecheck   # tsc --noEmit — deve retornar 0 erros antes de qualquer commit
npm run build       # build de produção — roda tudo, incluindo geração de páginas
npm run ci:local    # typecheck + build, o que o CI roda
```

Se `npm run typecheck` estourar memória no ambiente (aconteceu em sessões anteriores,
não reproduzido atualmente), use o fallback com limite explícito:

```bash
node --max-old-space-size=512 node_modules/.bin/tsc --noEmit -p tsconfig.json
```

## Convenções do painel administrativo (`app/admin/*`)

Aplicadas nas ~107 páginas do admin. Ao editar uma página existente, siga o padrão
que ela já usa em vez de introduzir um novo.

### Notificações

```ts
import { triggerToast } from "@/components/AdminToast";

triggerToast("Edital salvo.", "success");
triggerToast("Erro ao salvar.", "error");
```

Só existem dois tipos: `"success"` e `"error"`. Não há `"warning"` nem `"info"`.

O componente `<AdminToast />` (que renderiza o popup) só está montado dentro de
`app/admin/AdminShellClient.tsx`, ou seja, cobre tudo sob `/admin/*` automaticamente.
Se `triggerToast` for usado numa página **fora** do admin (como em `app/propostas/page.tsx`,
que é pública), é preciso montar `<AdminToast />` localmente nessa página — sem isso a
função não tem efeito nenhum, silenciosamente.

### Confirmação de ação destrutiva

```ts
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";

const ok = await confirmAction("Remover este registro?");
if (!ok) {
  if (!isConfirmModalReady() && !window.confirm("Remover este registro?")) return;
  else if (isConfirmModalReady()) return;
}
```

Nunca use `window.confirm` ou `alert()` como caminho primário — só como fallback do
padrão acima, para quando o modal ainda não montou.

### Estilo

Dois padrões coexistem — mantenha o que a página já usa, não converta sem necessidade:

- **Inline** (majoritário, preferir em código novo): `const s: Record<string, React.CSSProperties> = {...}`.
- **Classes CSS** (páginas mais antigas): `admin-h1`, `admin-card`, `admin-button`, `admin-subtitle` etc., definidas em `app/admin/globals.css`.

### Grades responsivas

Grids fixos de N colunas (`"1fr 1fr"`, `"280px 1fr"`) **não** colapsam sozinhos em telas
estreitas — diferente de `repeat(auto-fit/auto-fill, minmax(...))`, que já reflui
nativamente e não precisa de nada extra. Para os primeiros, use as classes utilitárias
de `app/admin/globals.css` em vez de inline:

- `.admin-grid-2` — formulário/cartão de 2 colunas, colapsa em ≤640px.
- `.admin-shell-split` / `.admin-shell-split--wide` — painel fixo + conteúdo (lista + editor), colapsa em ≤900px.
- `.admin-table-grid-wrap` — "tabela" feita com grid de colunas fixas (não um `<table>` real): rolagem horizontal em vez de espremer colunas, mesmo tratamento que as tabelas `<table>` já recebem via `overflowX`.

Como estilo inline sempre vence sobre classe CSS, ao aplicar uma dessas classes é
preciso **remover** `gridTemplateColumns`/`display: grid` do objeto de estilo inline —
caso contrário a media query da classe nunca entra em vigor.

### Cartões de filtro (`statsRow`)

Contadores clicáveis que filtram uma lista: `<button aria-pressed={...}>`, nunca
`<div onClick>` (não é focável nem anunciado por leitor de tela).

### Paginação

Nem toda tabela precisa — só implemente onde os dados crescem sem curadoria (envio
público, log de eventos). Listas curadas manualmente pelo admin (um item por parceiro,
um bloco por edital) tendem a ficar pequenas por anos; confirme com uma contagem real
no banco antes de assumir que uma tabela precisa paginar.

Dois padrões válidos quando precisa:

- **Servidor** — `app/admin/beneficiarios/page.tsx`: `POR_PAGINA` + `.range(offset, offset + POR_PAGINA - 1)` + `carregarMais()`.
- **Cliente** — `app/admin/editais/page.tsx`: `slice(0, (pagina + 1) * POR_PAGINA)` + botão "Carregar mais", resetando a página ao mudar filtro/busca.

Cuidado: se a lista depende de uma derivação que precisa ver **todos** os registros
(ex.: `app/admin/certidoes/page.tsx` decide qual versão de uma certidão é a vigente
olhando o conjunto inteiro), pagine só o **render**, nunca o `fetch` — paginar a busca
nesse caso produz dado errado.

## Segurança do banco (Supabase)

Toda alteração em produção — RLS, política, função, schema — exige aprovação explícita
do dono do projeto antes de aplicar. Não é uma regra pontual de uma tarefa específica;
vale para qualquer sessão futura. Ver `docs/PLANO-EXECUCAO.md` para o histórico de
alterações já aplicadas e o que ainda está pendente de aprovação.

Nunca criar infraestrutura de e-mail, domínio ou conta em serviço externo sem permissão
explícita do dono.
