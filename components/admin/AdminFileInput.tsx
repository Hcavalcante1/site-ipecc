import type { InputHTMLAttributes } from "react";

export type AdminFileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  className?: string;
  style?: React.CSSProperties;
};

export default function AdminFileInput({ className = "", style, ...props }: AdminFileInputProps) {
  return <input type="file" className={className} style={style} {...props} />;
}