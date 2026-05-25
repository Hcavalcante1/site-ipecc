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
import {
  PUBLIC_WHATSAPP_CHAT_OPTIONS,
  buildWhatsAppUrl,
  getWhatsAppUrlForChatOption,
} from "@/lib/whatsapp/publicWhatsApp";
import styles from "./WhatsAppFloatingChat.module.css";

type WhatsAppChatContextValue = {
  isOpen: boolean;
  openPanel: () => void;
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
  const [isOpen, setIsOpen] = useState(false);

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <WhatsAppChatContext.Provider
      value={{ isOpen, openPanel, closePanel, togglePanel }}
    >
      {children}
    </WhatsAppChatContext.Provider>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 0 1 0 14c-1.2 0-2.3-.3-3.3-.8l-.3-.2-2.7.7.7-2.6-.2-.3A7 7 0 0 1 12 5Zm-2 3.1c-.2 0-.4.1-.6.3-.2.2-.7.7-.7 1.7 0 1 .7 2 1 2.4.2.4 1.4 2.3 3.4 3.1 2 .8 2 .6 2.4.6.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1-.1-.1-.3-.2-.7-.3l-1.2-.6c-.2-.1-.4-.1-.6.1l-.5.7c-.1.2-.3.2-.5.1-.2-.1-1-.4-1.8-1.2-.7-.6-1.1-1.4-1.2-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.1-.2.2-.3.1-.2.1-.3 0-.4l-.6-1.4c-.2-.4-.3-.4-.5-.4Z" />
    </svg>
  );
}

export default function WhatsAppFloatingChat() {
  const { isOpen, closePanel, togglePanel } = useWhatsAppChat();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        closePanel();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [isOpen, closePanel]);

  return (
    <div ref={rootRef} className={styles.waChat}>
      {isOpen ? (
        <div
          id={panelId}
          className={styles.panel}
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${panelId}-title`}
        >
          <div className={styles.header}>
            <div className={styles.headerText}>
              <h2 id={`${panelId}-title`} className={styles.title}>
                Atendimento IPECC
              </h2>
              <p className={styles.subtitle}>Como podemos ajudar?</p>
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
          <ul className={styles.options} role="list">
            {PUBLIC_WHATSAPP_CHAT_OPTIONS.map((opt, index) => (
              <li key={opt.id}>
                <a
                  href={getWhatsAppUrlForChatOption(opt.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.optionBtn}
                  onClick={closePanel}
                >
                  <span className={styles.optionKey} aria-hidden="true">
                    {index + 1}
                  </span>
                  {opt.label}
                </a>
              </li>
            ))}
          </ul>
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
      ) : null}
      <button
        type="button"
        className={styles.fab}
        onClick={togglePanel}
        aria-label={
          isOpen ? "Fechar atendimento WhatsApp" : "Atendimento WhatsApp"
        }
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
      >
        <WhatsAppIcon />
      </button>
    </div>
  );
}
