"use client";

import { useEffect, useState } from "react";

let showToast: (msg: string, type: "success" | "error") => void;

export function triggerToast(msg: string, type: "success" | "error") {
  if (showToast) showToast(msg, type);
}

export default function AdminToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"success" | "error">("success");

  useEffect(() => {
    showToast = (msg, t) => {
      setMessage(msg);
      setType(t);
      setVisible(true);

      setTimeout(() => {
        setVisible(false);
      }, 3000);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        padding: "12px 18px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        background:
          type === "success"
            ? "rgba(34,197,94,0.95)"
            : "rgba(239,68,68,0.95)",
        color: "#fff",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
      }}
    >
      {message}
    </div>
  );
}