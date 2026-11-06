"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Invite = { email: string; proposta_nome: string; edital_titulo: string; expires_at: string; aceito_em: string | null; mod_propostas: boolean };
export default function AceitarConvitePropostaPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Verificando convite...");
  useEffect(() => { void (async () => {
    const res = await fetch(`/api/convite/acesso-proposta?token=${encodeURIComponent(token)}`);
    const json = await res.json();
    if (!res.ok) { setStatus(json.error === "convite_invalido" ? "Convite inválido" : "Não foi possível carregar o convite"); return; }
    const row = json.convite as Invite;
    if (row.aceito_em) { setStatus("Este convite já foi aceito."); return; }
    if (new Date(row.expires_at) < new Date()) { setStatus("Este convite expirou."); return; }
    setInvite(row);
    const { data: { user } } = await supabase.auth.getUser();
    setStatus(user ? "pronto" : "login");
  })(); }, [token]);
  async function accept() {
    setBusy(true); setError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { router.push(`/login?redirect=/convite/proposta/${token}`); return; }
    const res = await fetch("/api/convite/acesso-proposta", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ token }) });
    const json = await res.json(); setBusy(false);
    if (!res.ok) { setError(json.error === "email_nao_corresponde" ? "Entre com o mesmo e-mail que recebeu o convite." : json.error || "Não foi possível aceitar o convite."); return; }
    setStatus("Convite aceito. Redirecionando..."); setTimeout(() => router.replace(`/admin/propostas/${json.proposta_id}`), 1200);
  }
  const invitePath = `/convite/proposta/${encodeURIComponent(token)}`;
  const redirectParam = encodeURIComponent(invitePath);
  const cadastroUrl = `/cadastro?redirect=${redirectParam}&email=${encodeURIComponent(invite?.email || "")}`;
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f172a", color: "#e2e8f0", fontFamily: "system-ui", padding: 24 }}><section style={{ width: "100%", maxWidth: 520, padding: 32, borderRadius: 18, background: "#111c30", border: "1px solid #334155" }}><h1 style={{ marginTop: 0 }}>Convite de acesso a proposta</h1>{invite && <div style={{ lineHeight: 1.9 }}><p><b>Proposta:</b> {invite.proposta_nome}</p><p><b>Edital:</b> {invite.edital_titulo}</p><p><b>Módulo liberado:</b> Propostas</p><p><b>Enviado para:</b> {invite.email}</p><p><b>Expira em:</b> {new Date(invite.expires_at).toLocaleDateString("pt-BR")}</p></div>}<p>{status === "pronto" ? "Confirme para habilitar o acesso restrito a esta proposta." : status === "login" ? `Entre com ${invite?.email} para aceitar. Se ainda não tem conta, crie uma senha para esse e-mail.` : status}</p>{error && <p style={{ color: "#fca5a5" }}>{error}</p>}{status === "login" ? <div style={{ display: "grid", gap: 12 }}><button onClick={() => router.push(`/login?redirect=${redirectParam}`)}>Entrar para aceitar</button><a href={cadastroUrl} style={{ color: "#93c5fd" }}>Criar conta e definir senha</a></div> : status === "pronto" ? <button disabled={busy} onClick={() => void accept()}>{busy ? "Aceitando..." : "Aceitar convite"}</button> : null}</section></main>;
}
