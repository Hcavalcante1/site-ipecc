import type { TextareaHTMLAttributes } from "react";

export type AdminTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string;
  style?: React.CSSProperties;
};

export default function AdminTextarea({ className = "", style, ...props }: AdminTextareaProps) {
  return <textarea className={className} style={style} {...props} />;
}