import { verifyAdminSession } from "@/lib/auth/adminSession";

const BUCKETS_ADMIN_ONLY = new Set(["propostas"]);

export async function assertDownloadAllowed(
  bucket: string
): Promise<Response | null> {
  if (!BUCKETS_ADMIN_ONLY.has(bucket)) return null;

  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return new Response(auth.message, { status: auth.status });
  }

  return null;
}
