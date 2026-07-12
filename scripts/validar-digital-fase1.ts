/**
 * Validação Fase 1 Digital — templates + agent dry (sem rede se --offline).
 * Uso: npm run validar:digital
 */

import {
  draftFromEvento,
  draftFromNoticia,
  draftFromProjeto,
} from "../lib/digital/templates";
import { DIGITAL_PLATFORMS } from "../lib/digital/types";
import fs from "fs";
import path from "path";

let ok = 0;
let fail = 0;

function assert(name: string, cond: boolean) {
  if (cond) ok++;
  else {
    fail++;
    console.error("FALHA:", name);
  }
}

function main() {
  const n = draftFromNoticia({
    id: "n1",
    titulo: "Oficinas culturais",
    resumo: "Novas turmas em Suzano.",
  });
  assert("noticia tem titulo", n.title.includes("Oficinas"));
  assert("noticia tem link", n.body.includes("http"));
  assert("noticia source", n.source_type === "agent_noticia");

  const e = draftFromEvento({
    id: "e1",
    titulo: "Festival IPECC",
    data_evento: "2026-04-02",
    local: "Suzano",
  });
  assert("evento agenda", e.body.includes("Agenda"));
  assert("evento source", e.source_type === "agent_evento");

  const p = draftFromProjeto({
    slug: "valer-mais",
    titulo: "Programa Valer Mais",
    texto: "Valorização da educação pública.",
    href: "/projetos/valer-mais",
  });
  assert("projeto href", p.body.includes("/projetos/valer-mais"));
  assert("projeto source", p.source_type === "agent_projeto");

  assert("5 plataformas", DIGITAL_PLATFORMS.length === 5);

  const sql = path.join(
    process.cwd(),
    "docs/sql/digital-redes-fase1.sql"
  );
  assert("sql existe", fs.existsSync(sql));
  const sqlText = fs.readFileSync(sql, "utf8");
  assert("sql accounts", sqlText.includes("digital_accounts"));
  assert("sql posts", sqlText.includes("digital_posts"));

  const page = path.join(process.cwd(), "app/admin/digital/page.tsx");
  assert("admin page", fs.existsSync(page));
  const pageText = fs.readFileSync(page, "utf8");
  assert("ui copiar texto", pageText.includes("Copiar texto"));
  assert("ui editar texto", pageText.includes("Editar texto"));
  assert("ui destinos", pageText.includes("Destinos"));
  assert("ui midia", pageText.includes("URL de mídia"));
  assert("ui agendar", pageText.includes("Agendar"));
  assert("ui abrir rede", pageText.includes("Abrir"));
  const api = path.join(
    process.cwd(),
    "app/api/admin/digital/generate/route.ts"
  );
  assert("generate api", fs.existsSync(api));

  const labels = path.join(process.cwd(), "lib/digital/labels.ts");
  const labelsText = fs.readFileSync(labels, "utf8");
  assert(
    "ajuda publicacao assistida",
    labelsText.includes("AJUDA_PUBLICACAO_ASSISTIDA")
  );

  console.log(`\nOK: ${ok} | Falhas: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
