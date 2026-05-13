import type { ReactNode } from "react";

export type AdminCardProps = {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export default function AdminCard({ children, className = "", style }: AdminCardProps) {
  return <div className={className} style={style}>{children}</div>;
}
