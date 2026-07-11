"use client";

import { useEffect, useState } from "react";
import type { AdminModulo } from "@/lib/auth/adminEscopo";

export type AdminEscopoCliente = {
  loading: boolean;
  mestre: boolean;
  papel: string;
  modulos: AdminModulo[];
  processoIds: string[] | "todos";
};

const INICIAL: AdminEscopoCliente = {
  loading: true,
  mestre: true,
  papel: "mestre",
  modulos: [],
  processoIds: "todos",
};

/**
 * Lê escopo do POST /api/admin/session (mesmo gate do layout).
 * Mestre → processoIds "todos"; operador/externo → UUIDs do escopo.
 */
export function useAdminEscopoCliente(): AdminEscopoCliente {
  const [estado, setEstado] = useState<AdminEscopoCliente>(INICIAL);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const res = await fetch("/api/admin/session", {
          method: "POST",
          credentials: "include",
        });
        if (!ativo) return;

        if (!res.ok) {
          setEstado({ ...INICIAL, loading: false, mestre: false, processoIds: [] });
          return;
        }

        const json = (await res.json()) as {
          mestre?: boolean;
          papel?: string;
          modulos?: AdminModulo[];
          processoIds?: string[] | "todos";
          legadoIsAdmin?: boolean;
        };

        setEstado({
          loading: false,
          mestre: Boolean(json.mestre ?? json.legadoIsAdmin),
          papel: json.papel || "mestre",
          modulos: Array.isArray(json.modulos) ? json.modulos : [],
          processoIds:
            json.processoIds === "todos" || Array.isArray(json.processoIds)
              ? json.processoIds
              : [],
        });
      } catch {
        if (ativo) {
          setEstado({ ...INICIAL, loading: false, mestre: false, processoIds: [] });
        }
      }
    }

    void carregar();
    return () => {
      ativo = false;
    };
  }, []);

  return estado;
}
