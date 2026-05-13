import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";

export type AdminButtonProps = {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "danger" | "secondary";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">;

export default function AdminButton({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  loading = false,
  className = "",
  ...rest
}: AdminButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      data-variant={variant}
      {...rest}
    >
      {loading ? "Carregando..." : children}
    </button>
  );
}
