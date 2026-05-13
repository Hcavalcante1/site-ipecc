import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";
import AdminButton from "./AdminButton";

export type AdminLoadingButtonProps = {
  children: ReactNode;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  variant?: "primary" | "danger" | "secondary";
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">;

export default function AdminLoadingButton({
  children,
  loading = false,
  loadingText = "Carregando...",
  disabled = false,
  variant = "primary",
  onClick,
  type = "button",
  className = "",
  ...rest
}: AdminLoadingButtonProps) {
  return (
    <AdminButton
      type={type}
      variant={variant}
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
      loading={loading}
      {...rest}
    >
      {loading ? loadingText : children}
    </AdminButton>
  );
}
