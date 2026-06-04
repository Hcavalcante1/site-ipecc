"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    sessionStorage.removeItem("ipecc_admin_active");
    localStorage.removeItem("ipecc_admin_closed");
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <button onClick={handleLogout} className="admin-button">
      Sair
    </button>
  );
}


