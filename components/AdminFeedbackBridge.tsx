"use client";

import { useEffect } from "react";
import { triggerToast } from "@/components/AdminToast";
import { confirmAction } from "@/components/AdminConfirmModal";

export default function AdminFeedbackBridge() {
  useEffect(() => {
    // guarda funções originais
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    // 🔥 ALERT → TOAST GLOBAL
    window.alert = (message?: any) => {
      const text = String(message || "");

      const isError =
        text.toLowerCase().includes("erro") ||
        text.toLowerCase().includes("falha") ||
        text.toLowerCase().includes("inválido") ||
        text.toLowerCase().includes("denied");

      triggerToast(text, isError ? "error" : "success");
    };

    // 🔥 CONFIRM → usar o confirm nativo (síncrono) para manter comportamento esperado
    // o modal assíncrono pode ser usado separadamente via `confirmAction` quando necessário
    window.confirm = originalConfirm;
  

    // restaura ao desmontar
    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, []);

  return null;
}