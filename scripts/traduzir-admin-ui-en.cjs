/**
 * Substitui frases de UI em inglês no admin por português.
 * Só altera literais conhecidos (não renomeia variáveis).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(process.cwd(), "app", "admin");
const EXTRA = [
  path.join(process.cwd(), "components", "admin"),
];

const REPLACEMENTS = [
  ["Home – Hero", "Início – Destaque / topo"],
  ["Home – Sobre + CTA Final", "Início – Sobre + chamada final"],
  ["Home – Cards Principais", "Início – Cartões principais"],
  ["Hero – Quem Somos", "Destaque – Quem Somos"],
  ["CTA Final — Quem Somos", "Chamada final — Quem Somos"],
  ["Contato — Hero", "Contato — Destaque / topo"],
  ["Editais — Hero", "Editais — Destaque / topo"],
  ["Projetos — Hero", "Projetos — Destaque / topo"],
  ["Transparência — Hero", "Transparência — Destaque / topo"],
  ["Transparência — CTA / Acesso rápido", "Transparência — Chamada / Acesso rápido"],
  ["Editais — CTA", "Editais — Chamada"],
  ["CTA — Página Contato", "Chamada — Página Contato"],
  ["Projetos - CTA ", "Projetos — Chamada "],
  ["Título do Hero", "Título do destaque"],
  ["Texto do Hero", "Texto do destaque"],
  ['titulo="Hero"', 'titulo="Destaque / topo"'],
  ['titulo="Hero da página"', 'titulo="Destaque / topo da página"'],
  ['titulo="Hero da pagina"', 'titulo="Destaque / topo da página"'],
  ['titulo="CTA Final"', 'titulo="Chamada final"'],
  ['titulo="CTA / Chamada final"', 'titulo="Chamada final"'],
  ['titulo="CTA / Acesso rapido"', 'titulo="Chamada / Acesso rápido"'],
  ['label="Editar Hero"', 'label="Editar destaque / topo"'],
  ['label="Editar CTA final"', 'label="Editar chamada final"'],
  ["CTA salvo com sucesso.", "Chamada salva com sucesso."],
  ["Edite o bloco institucional e o CTA final.", "Edite o bloco institucional e a chamada final."],
  ["Erro ao salvar CTA:", "Erro ao salvar chamada:"],
  ["Descrição do CTA (lado direito)", "Descrição da chamada (lado direito)"],
  ["Checklist documental da proposta", "Lista de verificação documental da proposta"],
  ["Checklist operacional", "Lista de verificação operacional"],
  ["Abra Prestacao (admin)", "Abra Prestação (painel)"],
  ["Convenios (admin)", "Convênios (painel)"],
  ["Prestacao (admin)", "Prestação (painel)"],
  ["Substituir anexo (admin)", "Substituir anexo (painel)"],
  ["Falha ao sincronizar proposta_anexos", "Falha ao sincronizar anexos da proposta"],
  ["Upload realizado", "Envio concluído"],
  ["Erro no upload.", "Erro no envio do arquivo."],
  ["Erro no upload:", "Erro no envio:"],
  ["placeholder=\"Hashtags\"", "placeholder=\"Marcadores (#)\""],
  ["O agent gera", "O agente gera"],
  ["nas APIs das redes", "nas interfaces das redes"],
  ["Texto (use ENTER para novo parágrafo):", "Texto (use Enter para novo parágrafo):"],
  ["Texto (use ENTER para múltiplos parágrafos)", "Texto (use Enter para múltiplos parágrafos)"],
  [">CTA<", ">Chamada<"],
  ["<h2 style={{ marginTop: 20 }}>CTA</h2>", "<h2 style={{ marginTop: 20 }}>Chamada</h2>"],
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

const files = [...walk(ROOT), ...EXTRA.flatMap((d) => walk(d))];
let changedFiles = 0;
let totalHits = 0;

for (const file of files) {
  let text = fs.readFileSync(file, "utf8");
  let hits = 0;
  for (const [from, to] of REPLACEMENTS) {
    if (!text.includes(from)) continue;
    const n = text.split(from).length - 1;
    text = text.split(from).join(to);
    hits += n;
  }
  if (hits > 0) {
    fs.writeFileSync(file, text);
    changedFiles++;
    totalHits += hits;
    console.log(`OK ${hits}: ${path.relative(process.cwd(), file)}`);
  }
}

console.log(`\nArquivos: ${changedFiles} | Substituições: ${totalHits}`);
