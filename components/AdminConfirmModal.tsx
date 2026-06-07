"use client";

import { useEffect, useRef, useState } from "react";

/* ================= CONTROLADOR GLOBAL ================= */

let openConfirm: ((msg: string) => Promise<boolean>) | null = null;

export function isConfirmModalReady() {
  return openConfirm !== null;
}

export function confirmAction(message: string): Promise<boolean> {
  if (!openConfirm) {
    console.warn("Confirm modal ainda não está pronto");
    return Promise.resolve(false);
  }
  return openConfirm(message);
}

/* ================= COMPONENTE ================= */

export default function AdminConfirmModal() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  useEffect(() => {
    openConfirm = (msg: string) => {
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setMessage(msg);
        setVisible(true);
      });
    };

    return () => {
      openConfirm = null;
      resolverRef.current?.(false);
      resolverRef.current = null;
    };
  }, []);

  function handleConfirm(value: boolean) {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setVisible(false);
    resolve?.(value);
  }

  if (!visible) return null;

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={title}>Confirmação</h3>
        <p style={text}>{message}</p>

        <div style={actions}>
          <button type="button" style={cancelBtn} onClick={() => handleConfirm(false)}>
            Cancelar
          </button>

          <button type="button" style={confirmBtn} onClick={() => handleConfirm(true)}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= ESTILOS ================= */

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modal: React.CSSProperties = {
  width: 360,
  background: "#020617",
  borderRadius: 14,
  padding: 24,
  border: "1px solid #1e293b",
  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
};

const title: React.CSSProperties = {
  margin: 0,
  marginBottom: 10,
  color: "#e5e7eb",
};

const text: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 14,
  marginBottom: 20,
};

const actions: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const cancelBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid #334155",
  background: "transparent",
  color: "#e5e7eb",
  cursor: "pointer",
};

const confirmBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "none",
  background: "#dc2626",
  color: "#fff",
  cursor: "pointer",
};