"use client";

import type { CSSProperties, ReactNode } from "react";
import { useWhatsAppChat } from "./WhatsAppFloatingChat";

type WhatsAppLeadTriggerProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/** Abre o painel de pré-cadastro (sem ir direto ao wa.me). */
export default function WhatsAppLeadTrigger({
  children,
  className,
  style,
}: WhatsAppLeadTriggerProps) {
  const { openPanel } = useWhatsAppChat();

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={openPanel}
    >
      {children}
    </button>
  );
}
