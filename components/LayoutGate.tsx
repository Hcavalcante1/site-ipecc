/** @deprecated Não usado pelo App Router atual. Ver docs/PUBLIC-LAYOUT-LEGADO.md */
import type { ReactNode } from "react";

export default function LayoutGate({
  children,
  isLogin,
  PublicLayout,
}: {
  children: ReactNode;
  isLogin: boolean;
  PublicLayout: (props: { children: ReactNode }) => JSX.Element;
}) {
  // 🔒 LOGIN NÃO RENDERIZA O LAYOUT PÚBLICO
  if (isLogin) return <>{children}</>;

  // 🌐 resto renderiza o layout público
  return <PublicLayout>{children}</PublicLayout>;
}
