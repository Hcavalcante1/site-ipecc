"use client";

import type { CSSProperties, ReactNode } from "react";
import { isWhatsAppLeadHref } from "@/lib/whatsapp/publicWhatsApp";
import WhatsAppLeadTrigger from "./WhatsAppLeadTrigger";

type PublicWhatsAppCtaLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
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
}: PublicWhatsAppCtaLinkProps) {
  if (isWhatsAppLeadHref(href)) {
    return (
      <WhatsAppLeadTrigger className={className} style={style}>
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
