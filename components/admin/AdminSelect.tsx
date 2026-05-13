import type { SelectHTMLAttributes } from "react";

export type AdminSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  className?: string;
  style?: React.CSSProperties;
};

export default function AdminSelect({ className = "", style, children, ...props }: AdminSelectProps) {
  return (
    <select className={className} style={style} {...props}>
      {children}
    </select>
  );
}