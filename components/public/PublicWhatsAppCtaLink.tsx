"use client";

import type { CSSProperties, ReactNode } from "react";
import { isWhatsAppLeadHref } from "@/lib/whatsapp/publicWhatsApp";
import WhatsAppLeadTrigger from "./WhatsAppLeadTrigger";
import type { WhatsAppOpenPanelOptions } from "./WhatsAppFloatingChat";

type PublicWhatsAppCtaLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  assunto?: WhatsAppOpenPanelOptions["assunto"];
};

/**
 * Link público: wa.me, /contato e equivalentes abrem o pré-cadastro;
 * demais URLs seguem navegação normal.
 */
export default function PublicWhatsAppCtaLink({
  href,
  children,
  className,
  style,
  assunto,
}: PublicWhatsAppCtaLinkProps) {
  if (isWhatsAppLeadHref(href)) {
    return (
      <WhatsAppLeadTrigger className={className} style={style} assunto={assunto}>
        {children}
      </WhatsAppLeadTrigger>
    );
  }

  return (
    <a href={href} className={className} style={style}>
      {children}
    </a>
  );
}
