"use client";

import { useEffect } from "react";

export default function AdminButtonBridge() {
  useEffect(() => {
    function handleClick(e: any) {
      const btn = e.target.closest("button");

      if (!btn) return;

      // só aplica em botões de submit
      if (btn.type !== "submit") return;
      if (!btn.closest("form") && !btn.getAttribute("form")) return;

      // evita aplicar duas vezes
      if (btn.dataset.loading === "true") return;

      btn.dataset.loading = "true";

      // guarda texto original
      btn.dataset.originalText = btn.innerText;

      // aplica loading
      btn.innerText = "Processando...";
      btn.disabled = true;

      // reativa após 3s (fallback)
      setTimeout(() => {
        btn.innerText = btn.dataset.originalText || "Salvar";
        btn.disabled = false;
        btn.dataset.loading = "false";
      }, 3000);
    }

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return null;
}
