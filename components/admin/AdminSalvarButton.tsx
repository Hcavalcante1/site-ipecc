"use client";

import type { ButtonHTMLAttributes } from "react";

export type AdminSalvarButtonProps = {
  salvando: boolean;
  onClick: () => void;
  label?: string;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "style">;

export default function AdminSalvarButton({
  salvando,
  onClick,
  label = "Salvar alterações",
  className = "",
  style,
}: AdminSalvarButtonProps) {
  return (
    <button
      type="button"
      className={`admin-button admin-button--salvar${className ? ` ${className}` : ""}`}
      disabled={salvando}
      onClick={onClick}
      style={style}
    >
      {salvando ? "Salvando…" : label}
    </button>
  );
}
