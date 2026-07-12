"use client";

import { useEffect, useState } from "react";
import type { AdminModulo } from "@/lib/auth/adminEscopo";
import { MODULOS_MESTRE } from "@/lib/auth/adminEscopo";
import { supabase } from "@/lib/supabaseClient";

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

async function fallbackLegadoIsAdmin(): Promise<AdminEscopoCliente | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: isAdmin, error } = await supabase.rpc("is_admin", {
    user_id: user.id,
  });
  if (error || !isAdmin) return null;

  return {
    loading: false,
    mestre: true,
    papel: "mestre",
    modulos: [...MODULOS_MESTRE],
    processoIds: "todos",
  };
}

/**
 * Lê escopo do POST /api/admin/session (mesmo gate do layout).
 * Se a session falhar, faz fallback is_admin — alinhado ao admin/layout.
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
          const legado = await fallbackLegadoIsAdmin();
          if (!ativo) return;
          setEstado(
            legado ?? {
              ...INICIAL,
              loading: false,
              mestre: false,
              modulos: [],
              processoIds: [],
            }
          );
          return;
        }

        const json = (await res.json()) as {
          mestre?: boolean;
          papel?: string;
          modulos?: AdminModulo[];
          processoIds?: string[] | "todos";
          legadoIsAdmin?: boolean;
        };

        const mestre = Boolean(json.mestre || json.legadoIsAdmin);
        setEstado({
          loading: false,
          mestre,
          papel: json.papel || (mestre ? "mestre" : "operador"),
          modulos:
            Array.isArray(json.modulos) && json.modulos.length > 0
              ? json.modulos
              : mestre
                ? [...MODULOS_MESTRE]
                : [],
          processoIds:
            json.processoIds === "todos" || Array.isArray(json.processoIds)
              ? json.processoIds
              : mestre
                ? "todos"
                : [],
        });
      } catch {
        if (!ativo) return;
        const legado = await fallbackLegadoIsAdmin();
        if (!ativo) return;
        setEstado(
          legado ?? {
            ...INICIAL,
            loading: false,
            mestre: false,
            modulos: [],
            processoIds: [],
          }
        );
      }
    }

    void carregar();
    return () => {
      ativo = false;
    };
  }, []);

  return estado;
}
