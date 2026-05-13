"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Protocolo = {
  titulo: string;
  descricao: string;
};

export default function ProtocolosAdmin() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);

  /* LOAD */
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("paginas")
        .select("protocolos")
        .eq("slug", "contato")
        .single();

      if (Array.isArray(data?.protocolos)) {
        setProtocolos(data.protocolos);
      }

      setLoading(false);
    }

    load();
  }, []);

  function addProtocolo() {
    setProtocolos([...protocolos, { titulo: "", descricao: "" }]);
  }

  function update(i: number, field: keyof Protocolo, value: string) {
    const copy = [...protocolos];
    copy[i][field] = value;
    setProtocolos(copy);
  }

  function remove(i: number) {
    setProtocolos(protocolos.filter((_, idx) => idx !== i));
  }

  async function salvar() {
    setMsg("Salvando...");

    const { error } = await supabase
      .from("paginas")
      .update({
        protocolos,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", "contato");

    setMsg(error ? error.message : "Protocolos salvos com sucesso.");
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Protocolos</h1>

      {protocolos.map((p, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <input
            placeholder="Título"
            value={p.titulo}
            onChange={(e) => update(i, "titulo", e.target.value)}
          />
          <textarea
            placeholder="Descrição"
            value={p.descricao}
            onChange={(e) => update(i, "descricao", e.target.value)}
          />
          <button onClick={() => remove(i)}>Remover</button>
        </div>
      ))}

      <button onClick={addProtocolo}>Adicionar protocolo</button>
      <br />
      <button onClick={salvar}>Salvar</button>

      {msg && <p>{msg}</p>}
    </div>
  );
}



