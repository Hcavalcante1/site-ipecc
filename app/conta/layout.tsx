"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const NAV = [
  { href: "/conta", label: "Painel" },
  { href: "/conta/membros", label: "Membros" },
  { href: "/conta/faturamento", label: "Faturamento" },
];

export default function ContaLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checando, setChecando] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!ativo) return;
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      setEmail(user.email ?? null);
      setChecando(false);
    })();
    return () => { ativo = false; };
  }, [router, pathname]);

  async function sair() {
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  if (checando) {
    return <div style={s.loadingWrap}><p style={s.loadingTxt}>Carregando...</p></div>;
  }

  return (
    <div style={s.wrap}>
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <img src="/media/ipecc_logo_v2.png" alt="IPECC" style={s.logo} />
          <span style={s.brandLabel}>Minha conta</span>
        </div>
        <nav style={s.nav}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...s.navItem,
                ...(pathname === item.href ? s.navItemAtivo : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={s.sidebarFooter}>
          <p style={s.userEmail}>{email}</p>
          <button style={s.btnSair} onClick={sair}>Sair</button>
        </div>
      </aside>
      <main style={s.main}>{children}</main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  loadingWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" },
  loadingTxt: { color: "#64748b" },
  wrap: { minHeight: "100vh", display: "flex", background: "#0b1220" },
  sidebar: { width: 220, background: "#0f172a", borderRight: "1px solid rgba(148,163,184,0.12)", display: "flex", flexDirection: "column", padding: "20px 16px" },
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28, padding: "0 4px" },
  logo: { width: 32, height: 32, objectFit: "contain" },
  brandLabel: { color: "#e2e8f0", fontWeight: 800, fontSize: 14 },
  nav: { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  navItem: { padding: "10px 12px", borderRadius: 8, color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 600 },
  navItemAtivo: { background: "rgba(29,78,216,0.15)", color: "#93c5fd" },
  sidebarFooter: { paddingTop: 16, borderTop: "1px solid rgba(148,163,184,0.12)" },
  userEmail: { fontSize: 11, color: "#64748b", margin: "0 0 8px", wordBreak: "break-all" },
  btnSair: { width: "100%", padding: "8px 0", borderRadius: 8, border: "1px solid rgba(148,163,184,0.25)", background: "transparent", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  main: { flex: 1, minWidth: 0 },
};
