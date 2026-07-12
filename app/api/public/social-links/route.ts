import { NextResponse } from "next/server";
import { PUBLIC_SOCIAL_LINKS } from "@/lib/public/socialLinks";
import { supabasePublic } from "@/lib/supabasePublic";

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

    const links = data.map((row) => ({
      id: String(row.platform),
      href: String(row.href),
      label: String(row.label),
    }));

    return NextResponse.json({ ok: true, source: "digital_accounts", links });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "fallback",
      links: PUBLIC_SOCIAL_LINKS,
    });
  }
}
