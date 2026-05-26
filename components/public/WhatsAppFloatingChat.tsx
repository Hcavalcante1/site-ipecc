"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  buildWhatsAppUrl,
  getWhatsAppSubjectFromPathname,
  isValidWhatsAppSubjectId,
} from "@/lib/whatsapp/publicWhatsApp";
import WhatsAppLeadForm from "./WhatsAppLeadForm";
import styles from "./WhatsAppFloatingChat.module.css";

export type WhatsAppOpenPanelOptions = {
  assunto?: string;
};

type WhatsAppChatContextValue = {
  isOpen: boolean;
  defaultAssunto: string;
  openPanel: (options?: WhatsAppOpenPanelOptions) => void;
  closePanel: () => void;
  togglePanel: () => void;
};

const WhatsAppChatContext = createContext<WhatsAppChatContextValue | null>(
  null
);

export function useWhatsAppChat(): WhatsAppChatContextValue {
  const ctx = useContext(WhatsAppChatContext);
  if (!ctx) {
    throw new Error("useWhatsAppChat must be used within WhatsAppChatProvider");
  }
  return ctx;
}

export function WhatsAppChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [defaultAssunto, setDefaultAssunto] = useState("");

  const openPanel = useCallback(
    (options?: WhatsAppOpenPanelOptions) => {
      const fromRoute = getWhatsAppSubjectFromPathname(pathname);
      const requested = options?.assunto?.trim() || fromRoute;
      const assunto =
        requested && isValidWhatsAppSubjectId(requested) ? requested : "";
      setDefaultAssunto(assunto);
      setIsOpen(true);
    },
    [pathname]
  );

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setDefaultAssunto("");
  }, []);

  const togglePanel = useCallback(() => {
    if (isOpen) closePanel();
    else openPanel();
  }, [isOpen, closePanel, openPanel]);

  return (
    <WhatsAppChatContext.Provider
      value={{ isOpen, defaultAssunto, openPanel, closePanel, togglePanel }}
    >
      {children}
    </WhatsAppChatContext.Provider>
  );
}

export default function WhatsAppFloatingChat() {
  const { isOpen, closePanel, defaultAssunto } = useWhatsAppChat();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, closePanel]);

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Fechar atendimento"
        onClick={closePanel}
      />
      <div ref={rootRef} className={styles.waChat}>
        <div
          id={panelId}
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${panelId}-title`}
        >
          <div className={styles.header}>
            <div className={styles.headerText}>
              <h2 id={`${panelId}-title`} className={styles.title}>
                Atendimento IPECC
              </h2>
              <p className={styles.subtitle}>
                Preencha seus dados para continuar no WhatsApp
              </p>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={closePanel}
              aria-label="Fechar atendimento"
            >
              ×
            </button>
          </div>
          <WhatsAppLeadForm
            key={defaultAssunto || "default"}
            initialAssunto={defaultAssunto}
            onSuccess={closePanel}
          />
          <div className={styles.footer}>
            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.fallbackLink}
            >
              Abrir WhatsApp com mensagem padrão
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
