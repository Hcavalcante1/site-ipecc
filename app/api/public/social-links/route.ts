import { NextResponse } from "next/server";
import { PUBLIC_SOCIAL_LINKS } from "@/lib/public/socialLinks";
import { supabasePublic } from "@/lib/supabasePublic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Links oficiais do site para topbar e rodapé.
 * Usa a lista fixa se a tabela Digital ainda não existir.
 */
export async function GET() {
  try {
    const { data, error } = await supabasePublic
      .from("digital_accounts")
      .select("platform, label, href")
      .eq("scope", "site")
      .eq("ativo", true)
      .order("platform", { ascending: true });

    if (error || !data?.length) {
      return NextResponse.json({
        ok: true,
        source: "fallback",
        links: PUBLIC_SOCIAL_LINKS,
        aviso: error?.message,
      });
    }

    // Mescla: banco é autoritativo para plataformas que existem com ativo=true;
    // para as ausentes, mantém o fallback estático (evita sumiço silencioso).
    const dbById = new Map(
      data.map((row) => [String(row.platform), { id: String(row.platform), href: String(row.href), label: String(row.label) }])
    );
    const links = PUBLIC_SOCIAL_LINKS.map((fb) => dbById.get(fb.id) ?? fb);

    return NextResponse.json({ ok: true, source: "digital_accounts", links });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "fallback",
      links: PUBLIC_SOCIAL_LINKS,
    });
  }
}
