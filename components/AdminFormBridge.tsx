"use client";

import { useEffect } from "react";
import { triggerToast } from "@/components/AdminToast";

export default function AdminFormBridge() {
  useEffect(() => {
    function handleSubmit(e: any) {
      const form = e.target;

      if (!(form instanceof HTMLFormElement)) return;

      const inputs = form.querySelectorAll("input, textarea, select");

      let hasError = false;

      inputs.forEach((input: any) => {
        if (input.hasAttribute("required") && !input.value.trim()) {
          hasError = true;

          input.style.border = "1px solid #ef4444";
        } else {
          input.style.border = "1px solid #334155";
        }
      });

      if (hasError) {
        e.preventDefault();

        triggerToast("Preencha todos os campos obrigatórios.", "error");
      }
    }

    document.addEventListener("submit", handleSubmit);

    return () => {
      document.removeEventListener("submit", handleSubmit);
    };
  }, []);

  return null;
}