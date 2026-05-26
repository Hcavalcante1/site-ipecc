"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <button onClick={handleLogout} className="admin-button">
      Sair
    </button>
  );
}


