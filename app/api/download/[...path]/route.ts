import { NextRequest } from "next/server";
import { assertDownloadAllowed } from "@/lib/downloadAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function contentTypeFromPath(filePath: string) {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const parts = params.path;

    if (!parts || parts.length < 2) {
      return new Response("Caminho inválido", { status: 400 });
    }

    const normalized = parts[0] === "public" ? parts.slice(1) : parts;

    const bucket = normalized[0];
    let filePath = normalized.slice(1).join("/");

    if (!bucket || !filePath) {
      return new Response("Caminho inválido", { status: 400 });
    }

    filePath = filePath.replace(/^public\//, "");
    filePath = filePath.replace(/public\/public/g, "public");

    const denied = await assertDownloadAllowed(bucket);
    if (denied) return denied;

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!base) {
      console.error("SUPABASE_URL não definida");

      try {
        await supabaseAdmin.from("logs_download").insert({
          erro: "SUPABASE_URL não definida",
        });
      } catch {}

      return new Response("Erro interno", { status: 500 });
    }

    if (bucket === "propostas") {
      const candidatos = [
        filePath,
        filePath.startsWith("public/") ? null : `public/${filePath}`,
      ].filter((p): p is string => !!p);

      let data: Blob | null = null;
      let pathUsado = filePath;
      let ultimoErro: string | null = null;

      for (const candidato of candidatos) {
        const res = await supabaseAdmin.storage.from(bucket).download(candidato);
        if (res.data) {
          data = res.data;
          pathUsado = candidato;
          break;
        }
        ultimoErro = res.error?.message || JSON.stringify(res.error) || null;
      }

      if (!data) {
        console.error("DOWNLOAD ERROR (propostas):", {
          bucket,
          filePath,
          candidatos,
          message: ultimoErro,
        });

        try {
          await supabaseAdmin.from("logs_download").insert({
            bucket,
            file_path: filePath,
            status: 404,
            status_text: ultimoErro || "Arquivo não encontrado no storage",
          });
        } catch {}

        return new Response("Arquivo não encontrado", { status: 404 });
      }

      filePath = pathUsado;

      const buffer = await data.arrayBuffer();
      const contentType = contentTypeFromPath(filePath);

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${filePath.split("/").pop()}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const url = `${base}/storage/v1/object/public/${bucket}/${filePath}`;

    const res = await fetch(url);

    if (!res.ok) {
      console.error("DOWNLOAD ERROR:", {
        bucket,
        filePath,
        url,
        status: res.status,
      });

      try {
        await supabaseAdmin.from("logs_download").insert({
          bucket,
          file_path: filePath,
          url,
          status: res.status,
          status_text: res.statusText,
        });
      } catch {}

      return new Response("Arquivo não encontrado", { status: 404 });
    }

    const buffer = await res.arrayBuffer();
    const contentType =
      res.headers.get("content-type") || contentTypeFromPath(filePath);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filePath.split("/").pop()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("ERRO API DOWNLOAD:", e);

    try {
      await supabaseAdmin.from("logs_download").insert({
        erro: String(e),
      });
    } catch {}

    return new Response("Erro interno", { status: 500 });
  }
}
