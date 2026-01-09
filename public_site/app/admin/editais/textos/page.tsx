"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Secao = {
  id?: string;
  slug: string;
  tipo: string;
  titulo: string;
  descricao: string;
  ativo: boolean;
  ordem: number;
};

export default function EditaisTextosPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [secoes, setSecoes] = useState<Secao[]>([]);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from("editais_secoes")
        .select("*")
        .order("ordem", { ascending: true });

      setSecoes(data || []);
      setCarregando(false);
    }

    carregar();
  }, []);

  function editarSecao(slug: string) {
    router.push(`/admin/editais/textos/${slug}`);
  }

  if (carregando) {
    return (
      <div className="admin-box">
        <h1 className="admin-h1">Textos do Edital</h1>
        <p>Carregando…</p>
      </div>
    );
  }

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Textos do Edital</h1>

      <p className="admin-subtitle">
        Gerencie os blocos de texto da página pública de editais.
      </p>

      <div className="admin-form" style={{ marginTop: 24 }}>
        {secoes.map((secao) => (
          <div key={secao.id} className="admin-card" style={{ marginBottom: 16 }}>
            <strong>{secao.titulo || secao.slug}</strong>

            <p style={{ marginTop: 6 }}>
              Tipo: <code>{secao.tipo}</code>
            </p>

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="admin-button-small"
                onClick={() => editarSecao(secao.slug)}
              >
                Editar
              </button>

              <button
                type="button"
                className="admin-button-small"
                style={{ marginLeft: 8 }}
                onClick={async () => {
                  await supabase
                    .from("editais_secoes")
                    .update({
                      ativo: !secao.ativo,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", secao.id);

                  setSecoes((prev) =>
                    prev.map((s) =>
                      s.id === secao.id ? { ...s, ativo: !s.ativo } : s
                    )
                  );
                }}
              >
                {secao.ativo ? "Ativo" : "Inativo"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
