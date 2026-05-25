"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import {
  buildStorageFileName,
  PDF_ACCEPT,
  validatePdfFile,
} from "@/lib/fileUploadGuards";
import { supabase } from "@/lib/supabaseClient";

type Documento = {
  id: number;
  titulo: string;
  conteudo: string;
  arquivo?: string;
};

type Faq = {
  id: number;
  pergunta: string;
  resposta: string;
};

export default function AdminEditaisPage() {
  const [tituloHero, setTituloHero] = useState("Editais e Chamadas Públicas");
  const [textoHero, setTextoHero] = useState(
    "Acompanhe os editais e chamadas públicas promovidos pelo Instituto."
  );
  const [textoIntro, setTextoIntro] = useState(
    "Nesta página você encontra todas as oportunidades abertas, encerradas ou previstas."
  );

  const [documentos, setDocumentos] = useState<Documento[]>([
    { id: 1, titulo: "Estatuto Social", conteudo: "Documento institucional da organização." },
    { id: 2, titulo: "CNPJ", conteudo: "Cadastro Nacional da Pessoa Jurídica." },
  ]);

  const [faqs, setFaqs] = useState<Faq[]>([
    { id: 1, pergunta: "Quem pode participar?", resposta: "Organizações da Sociedade Civil regularmente constituídas." },
    { id: 2, pergunta: "Como enviar propostas?", resposta: "As propostas devem ser enviadas exclusivamente pela plataforma." },
  ]);

  const [msg, setMsg] = useState("");

  const sInput: CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(148,163,184,.8)",
    background: "rgba(15,23,42,.85)",
    color: "#e5e7eb",
    fontSize: ".9rem",
  };

  const sTextarea: CSSProperties = { ...sInput, minHeight: 90, resize: "vertical" };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const { error } = await supabase
      .from("paginas")
      .upsert(
        {
          slug: "editais",
          titulo_hero: tituloHero,
          texto_hero: textoHero,
          texto_intro: textoIntro,
          documentos,
          faqs,
        },
        { onConflict: "slug" }
      );

    setMsg(error ? error.message : "Alterações salvas com sucesso.");
  }

  async function uploadDocumento(i: number, file: File) {
    validatePdfFile(file);

    const path = `editais/${buildStorageFileName(file, "documento")}`;
    await supabase.storage.from("paginas").upload(path, file, {
      upsert: true,
      contentType: "application/pdf",
    });

    const novo = [...documentos];
    novo[i].arquivo = path;
    setDocumentos(novo);
  }

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Página Pública – Editais</h1>

      <form onSubmit={handleSubmit} className="admin-card">
        <label>Título (Hero)</label>
        <input style={sInput} value={tituloHero} onChange={(e) => setTituloHero(e.target.value)} />

        <label>Texto (Hero)</label>
        <textarea style={sTextarea} value={textoHero} onChange={(e) => setTextoHero(e.target.value)} />

        <label>Texto introdutório</label>
        <textarea style={sTextarea} value={textoIntro} onChange={(e) => setTextoIntro(e.target.value)} />

        <h3 style={{ marginTop: 30 }}>Documentos</h3>

        {documentos.map((doc, i) => (
          <div key={doc.id} style={{ marginBottom: 12 }}>
            <input
              style={sInput}
              value={doc.titulo}
              onChange={(e) => {
                const novo = [...documentos];
                novo[i].titulo = e.target.value;
                setDocumentos(novo);
              }}
            />
            <textarea
              style={sTextarea}
              value={doc.conteudo}
              onChange={(e) => {
                const novo = [...documentos];
                novo[i].conteudo = e.target.value;
                setDocumentos(novo);
              }}
            />
            <input
              type="file"
              accept={PDF_ACCEPT}
              onChange={(e) => {
                if (!e.target.files?.[0]) return;
                uploadDocumento(i, e.target.files[0]).catch((err) => {
                  e.currentTarget.value = "";
                  alert(err instanceof Error ? err.message : "Arquivo invalido.");
                });
              }}
            />
          </div>
        ))}

        <h3 style={{ marginTop: 30 }}>FAQ</h3>

        {faqs.map((faq, i) => (
          <div key={faq.id} style={{ marginBottom: 12 }}>
            <input
              style={sInput}
              value={faq.pergunta}
              onChange={(e) => {
                const novo = [...faqs];
                novo[i].pergunta = e.target.value;
                setFaqs(novo);
              }}
            />
            <textarea
              style={sTextarea}
              value={faq.resposta}
              onChange={(e) => {
                const novo = [...faqs];
                novo[i].resposta = e.target.value;
                setFaqs(novo);
              }}
            />
          </div>
        ))}

        <button className="admin-button" type="submit">Salvar alterações</button>
        {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
      </form>
    </div>
  );
}

