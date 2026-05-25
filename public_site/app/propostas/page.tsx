"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PDF_ACCEPT = "application/pdf,.pdf";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ================= ESTILOS VISUAIS (SÓ APARÊNCIA) ================= */
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  padding: "12px 14px",
  fontSize: 15,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 15,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  resize: "vertical",
  boxSizing: "border-box",
};
/* ================================================================= */

export default function PropostasPage() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [estatuto, setEstatuto] = useState<File | null>(null);
  const [cnpjArquivo, setCnpjArquivo] = useState<File | null>(null);

function validarPdf(file: File) {
  const nome = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || nome.endsWith(".pdf");

  if (!isPdf) {
    throw new Error("Envie apenas arquivos PDF.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("O arquivo deve ter no maximo 10 MB.");
  }
}

function selecionarPdf(
  file: File | undefined,
  setter: React.Dispatch<React.SetStateAction<File | null>>,
  input: HTMLInputElement
) {
  if (!file) {
    setter(null);
    return;
  }

  try {
    validarPdf(file);
    setter(file);
  } catch (err) {
    setter(null);
    input.value = "";
    alert(err instanceof Error ? err.message : "Arquivo invalido.");
  }
}

async function uploadArquivo(file: File, tipo: string) {
  validarPdf(file);

  // Normaliza o nome do arquivo para evitar erro no Supabase Storage
  const nomeSeguro = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9.-]/g, "-") // troca espaços e símbolos por -
    .toLowerCase();

  const idArquivo = crypto.randomUUID();
  const nomeFinal = `${Date.now()}-${idArquivo}-${tipo}-${nomeSeguro}`;
  const path = `public/${nomeFinal}`;

  const { error } = await supabase.storage
    .from("propostas")
    .upload(path, file, { upsert: false });

  if (error) throw error;

  return `propostas/${path}`;
}


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    const nome = (form.querySelector("[data-field='nome']") as HTMLInputElement).value;
    const cnpj = (form.querySelector("[data-field='cnpj']") as HTMLInputElement).value;
    const email = (form.querySelector("[data-field='email']") as HTMLInputElement).value;
    const telefone = (form.querySelector("[data-field='telefone']") as HTMLInputElement).value;
    const mensagem = (form.querySelector("[data-field='mensagem']") as HTMLTextAreaElement).value;

    try {
      const arquivo_url = arquivo ? await uploadArquivo(arquivo, "proposta") : null;
      const estatuto_url = estatuto ? await uploadArquivo(estatuto, "estatuto") : null;
      const cnpj_url = cnpjArquivo ? await uploadArquivo(cnpjArquivo, "cnpj") : null;

      const { error } = await supabase.from("propostas").insert({
        nome,
        cnpj,
        email,
        telefone,
        mensagem,
        arquivo_url,
        estatuto_url,
        cnpj_url,
      });

      if (error) throw error;

      alert("Proposta enviada com sucesso!");
      form.reset();
      setArquivo(null);
      setEstatuto(null);
      setCnpjArquivo(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar proposta");
    }
  }

  return (
    <>
      {/* ================= TARJA AZUL ================= */}
      <div style={{ padding: "40px 16px" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "48px 32px",
            borderRadius: 24,
            background: "linear-gradient(90deg, #0d6efd, #00c6a7)",
            textAlign: "center",
            color: "#fff",
          }}
        >
          <h1 style={{ fontSize: 36, marginBottom: 10 }}>
            Enviar Proposta
          </h1>
          <p style={{ fontSize: 18, margin: 0 }}>
            Transparência, participação e responsabilidade institucional.
          </p>
        </div>
      </div>

      {/* ================= FORMULÁRIO ================= */}
      <section style={{ padding: "0 16px 60px" }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            background: "#fff",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 10px 30px rgba(0,0,0,.08)",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 24 }}
          >
            {/* CAMPOS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <input data-field="nome" placeholder="Empresa" required style={inputStyle} />
              <input data-field="cnpj" placeholder="CNPJ" required style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <input data-field="email" placeholder="E-mail" required style={inputStyle} />
              <input data-field="telefone" placeholder="Telefone" required style={inputStyle} />
            </div>

            <textarea
              data-field="mensagem"
              placeholder="Mensagem"
              rows={6}
              required
              style={textareaStyle}
            />

            {/* ================= UPLOADS ================= */}
            <div
              style={{
                background: "linear-gradient(90deg, #007bff, #00c6a7)",
                padding: 24,
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div>
                <label style={{ color: "#fff", fontWeight: 600, marginBottom: 6, display: "block" }}>
                  Proposta (PDF)
                </label>
                <input
                  type="file"
                  accept={PDF_ACCEPT}
                  style={{ width: "100%", background: "#fff", padding: 8 }}
                  onChange={(e) => selecionarPdf(e.target.files?.[0], setArquivo, e.currentTarget)}
                />
              </div>

              <div>
                <label style={{ color: "#fff", fontWeight: 600, marginBottom: 6, display: "block" }}>
                  Estatuto Social (PDF)
                </label>
                <input
                  type="file"
                  accept={PDF_ACCEPT}
                  style={{ width: "100%", background: "#fff", padding: 8 }}
                  onChange={(e) => selecionarPdf(e.target.files?.[0], setEstatuto, e.currentTarget)}
                />
              </div>

              <div>
                <label style={{ color: "#fff", fontWeight: 600, marginBottom: 6, display: "block" }}>
                  CNPJ (PDF)
                </label>
                <input
                  type="file"
                  accept={PDF_ACCEPT}
                  style={{ width: "100%", background: "#fff", padding: 8 }}
                  onChange={(e) => selecionarPdf(e.target.files?.[0], setCnpjArquivo, e.currentTarget)}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: 12,
                  padding: "14px",
                  borderRadius: 10,
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Enviar Proposta
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}




