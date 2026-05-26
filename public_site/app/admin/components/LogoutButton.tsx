"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <button onClick={handleLogout} className="admin-button">
      Sair
    </button>
  );
}


