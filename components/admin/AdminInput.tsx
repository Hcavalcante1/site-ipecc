import type { InputHTMLAttributes } from "react";

export type AdminInputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  style?: React.CSSProperties;
};

export default function AdminInput({ className = "", style, ...props }: AdminInputProps) {
  return <input className={className} style={style} {...props} />;
}