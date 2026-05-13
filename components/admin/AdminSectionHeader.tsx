import React, { type HTMLAttributes } from "react";

export type AdminSectionHeaderProps = HTMLAttributes<HTMLHeadingElement> & {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  style?: React.CSSProperties;
};

export default function AdminSectionHeader({
  level = 1,
  className = "",
  style,
  children,
  ...props
}: AdminSectionHeaderProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return React.createElement(Tag, { className, style, ...props }, children);
}