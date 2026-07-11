"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type LogoutButtonProps = {
  className?: string;
};

export default function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    sessionStorage.removeItem("ipecc_admin_active");
    localStorage.removeItem("ipecc_admin_closed");
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className || "admin-logout-btn"}
    >
      Sair
    </button>
  );
}
