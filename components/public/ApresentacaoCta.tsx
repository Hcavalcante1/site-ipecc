"use client";

import Link from "next/link";
import WhatsAppLeadTrigger from "@/components/public/WhatsAppLeadTrigger";
import styles from "./apresentacao-landing.module.css";

type Props = {
  variant?: "hero" | "band" | "final";
};

export default function ApresentacaoCta({ variant = "hero" }: Props) {
  if (variant === "band") {
    return (
      <div className={styles.leadBandActions}>
        <WhatsAppLeadTrigger className={styles.btnPrimary} assunto="equipe">
          Falar com o IPECC
        </WhatsAppLeadTrigger>
        <Link href="/propostas" className={styles.btnOutline}>
          Enviar proposta
        </Link>
      </div>
    );
  }

  if (variant === "final") {
    return (
      <div className={styles.ctaActions}>
        <WhatsAppLeadTrigger className={styles.btnCta} assunto="equipe">
          Atendimento WhatsApp
        </WhatsAppLeadTrigger>
        <Link href="/propostas" className={styles.btnCtaOutline}>
          Enviar proposta
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.heroActions}>
      <WhatsAppLeadTrigger className={styles.btnPrimary} assunto="equipe">
        Solicitar contato
      </WhatsAppLeadTrigger>
      <Link href="/projetos" className={styles.btnGhost}>
        Ver projetos
      </Link>
    </div>
  );
}
