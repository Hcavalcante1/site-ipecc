"use client";

import WhatsAppLeadTrigger from "./WhatsAppLeadTrigger";
import type { WhatsAppOpenPanelOptions } from "./WhatsAppFloatingChat";
import styles from "./PublicWhatsAppHelpLine.module.css";

type PublicWhatsAppHelpLineProps = {
  assunto: NonNullable<WhatsAppOpenPanelOptions["assunto"]>;
  intro?: string;
  linkLabel?: string;
};

/** Linha discreta de ajuda que abre o pré-cadastro WhatsApp. */
export default function PublicWhatsAppHelpLine({
  assunto,
  intro = "Dúvidas?",
  linkLabel = "Fale conosco no WhatsApp",
}: PublicWhatsAppHelpLineProps) {
  return (
    <p className={styles.help}>
      {intro}{" "}
      <WhatsAppLeadTrigger assunto={assunto} className={styles.link}>
        {linkLabel}
      </WhatsAppLeadTrigger>
      .
    </p>
  );
}
