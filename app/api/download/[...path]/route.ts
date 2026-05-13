import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const parts = params.path;

    // 🔥 valida estrutura básica
    if (!parts || parts.length < 2) {
      return new Response("Caminho inválido", { status: 400 });
    }

    // 🔥 remove duplicação de public
    const normalized =
      parts[0] === "public" ? parts.slice(1) : parts;

    const bucket = normalized[0];
    let filePath = normalized.slice(1).join("/");

    if (!bucket || !filePath) {
      return new Response("Caminho inválido", { status: 400 });
    }

    // 🔥 sanitização (ANTI BUG FUTURO)
    filePath = filePath.replace(/^public\//, "");
    filePath = filePath.replace(/public\/public/g, "public");

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

    const url = `${base}/storage/v1/object/public/${bucket}/${filePath}`;

    const res = await fetch(url);

    // 🔥 ERRO DE DOWNLOAD
    if (!res.ok) {
      console.error("DOWNLOAD ERROR:", {
        bucket,
        filePath,
        url,
        status: res.status,
      });

      // 🔥 LOG NO BANCO
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

    // 🔥 CORREÇÃO DEFINITIVA PDF (ANTI GOOGLE)
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filePath.split("/").pop()}"`,
        "Cache-Control": "no-store",
      },
    });

  } catch (e) {
    console.error("ERRO API DOWNLOAD:", e);

    // 🔥 LOG NO BANCO
    try {
      await supabaseAdmin.from("logs_download").insert({
        erro: String(e),
      });
    } catch {}

    return new Response("Erro interno", { status: 500 });
  }
}