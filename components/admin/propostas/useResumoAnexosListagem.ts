import { useEffect, useState } from "react";
import { extrairPathsAnexoProposta } from "@/lib/documental/propostaPaths";

export type ResumoAnexosProposta = {
  total: number;
  disponiveis: number;
  orfaos: number;
};

export function useResumoAnexosListagem(
  propostas: Array<Record<string, unknown> & { id: string }>
) {
  const [resumo, setResumo] = useState<Record<string, ResumoAnexosProposta>>({});
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (propostas.length === 0) {
      setResumo({});
      setCarregando(false);
      return;
    }

    let cancelado = false;

    async function carregar() {
      setCarregando(true);

      try {
        const res = await fetch("/api/admin/propostas/resumo-anexos", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propostas: propostas.map((p) => ({
              id: p.id,
              paths: extrairPathsAnexoProposta(p),
            })),
          }),
        });

        const json = await res.json();

        if (!cancelado && res.ok && json.ok) {
          setResumo(json.resumo || {});
        }
      } catch {
        if (!cancelado) setResumo({});
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [propostas]);

  return { resumo, carregando };
}
