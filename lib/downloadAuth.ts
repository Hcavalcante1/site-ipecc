import { verifyAdminSession } from "@/lib/auth/adminSession";
import { isMestre } from "@/lib/auth/adminEscopo";

const BUCKETS_ADMIN_ONLY = new Set(["propostas"]);

export async function assertDownloadAllowed(
  bucket: string
): Promise<Response | null> {
  if (!BUCKETS_ADMIN_ONLY.has(bucket)) return null;

  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return new Response(auth.message, { status: auth.status });
  }
  if (!isMestre(auth.contexto)) {
    return new Response("Acesso restrito ao administrador mestre.", { status: 403 });
  }

  return null;
}
