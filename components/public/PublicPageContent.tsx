import type { ReactNode } from "react";

type PublicPageContentProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

/** Wrapper padrão `.public-content` + `.public-content__inner`. */
export default function PublicPageContent({
  children,
  className,
  innerClassName,
}: PublicPageContentProps) {
  const rootClass = ["public-content", className].filter(Boolean).join(" ");
  const innerClass = ["public-content__inner", innerClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <div className={innerClass}>{children}</div>
    </div>
  );
}
