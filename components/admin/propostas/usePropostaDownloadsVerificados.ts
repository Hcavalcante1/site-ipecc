import { useEffect, useState } from "react";

export type PropostaDownloadItem = {
  label: string;
  path: string;
  bg: string;
  color: string;
};

export type PropostaDownloadOrfao = {
  label: string;
  path: string;
};

export function usePropostaDownloadsVerificados(itens: PropostaDownloadItem[]) {
  const [disponiveis, setDisponiveis] = useState<PropostaDownloadItem[]>(itens);
  const [orfaos, setOrfaos] = useState<PropostaDownloadOrfao[]>([]);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    if (itens.length === 0) {
      setDisponiveis([]);
      setOrfaos([]);
      setVerificando(false);
      return;
    }

    let cancelado = false;

    async function verificar() {
      setVerificando(true);

      try {
        const res = await fetch("/api/admin/propostas/verificar-anexos", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itens: itens.map((item) => ({
              path: item.path,
              label: item.label,
            })),
          }),
        });

        const json = await res.json();

        if (cancelado || !res.ok || !json.ok) {
          if (!cancelado) {
            setDisponiveis(itens);
            setOrfaos([]);
          }
          return;
        }

        const existsMap = new Map<string, boolean>(
          (json.resultados || []).map(
            (r: { path: string; exists: boolean }) => [r.path, r.exists]
          )
        );

        const ok: PropostaDownloadItem[] = [];
        const faltando: PropostaDownloadOrfao[] = [];

        for (const item of itens) {
          if (existsMap.get(item.path)) {
            ok.push(item);
          } else {
            faltando.push({ label: item.label, path: item.path });
          }
        }

        if (!cancelado) {
          setDisponiveis(ok);
          setOrfaos(faltando);
        }
      } catch {
        if (!cancelado) {
          setDisponiveis(itens);
          setOrfaos([]);
        }
      } finally {
        if (!cancelado) setVerificando(false);
      }
    }

    verificar();

    return () => {
      cancelado = true;
    };
  }, [itens]);

  return { disponiveis, orfaos, verificando };
}
