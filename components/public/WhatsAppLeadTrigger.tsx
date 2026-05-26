"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  useWhatsAppChat,
  type WhatsAppOpenPanelOptions,
} from "./WhatsAppFloatingChat";

type WhatsAppLeadTriggerProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Pré-seleciona assunto no formulário (ex.: "eventos"). */
  assunto?: WhatsAppOpenPanelOptions["assunto"];
};

/** Abre o painel de pré-cadastro (sem ir direto ao wa.me). */
export default function WhatsAppLeadTrigger({
  children,
  className,
  style,
  assunto,
}: WhatsAppLeadTriggerProps) {
  const { openPanel } = useWhatsAppChat();

  return (
    <button
      type="button"
      className={className}
      style={{ cursor: "pointer", ...style }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openPanel(assunto ? { assunto } : undefined);
      }}
    >
      {children}
    </button>
  );
}
