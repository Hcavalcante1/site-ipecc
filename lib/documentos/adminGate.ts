import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { isMestre } from "@/lib/auth/adminEscopo";

/** Gestão Documental é exclusiva do administrador mestre. */
export async function denyIfSemModuloDocumentos() {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return {
      denied: NextResponse.json(
        { ok: false, error: auth.message },
        { status: auth.status }
      ),
      auth: null as null,
    };
  }
  if (!isMestre(auth.contexto)) {
    return {
      denied: NextResponse.json(
        {
          ok: false,
          error:
            "A Gestão Documental é exclusiva do administrador mestre.",
        },
        { status: 403 }
      ),
      auth: null as null,
    };
  }
  return { denied: null, auth };
}
