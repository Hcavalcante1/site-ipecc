"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import {
  createSiteBotContext,
  getSiteBotQuickOptions,
  runSiteBotTurn,
} from "@/lib/whatsapp/siteBotScript";
import type { ConversationContext } from "@/lib/whatsapp/types";
import { useWhatsAppChat } from "./WhatsAppFloatingChat";
import styles from "./WhatsAppSiteBotFab.module.css";

type ChatMsg = {
  id: string;
  role: "bot" | "user";
  text: string;
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Botão flutuante (menu suspenso) com script automático do site.
 * Não substitui o WhatsApp do menu superior — só responde no site.
 */
export default function WhatsAppSiteBotFab() {
  const { openPanel, isOpen: leadOpen } = useWhatsAppChat();
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<ConversationContext>(() => createSiteBotContext());
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [started, setStarted] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (leadOpen) setOpen(false);
  }, [leadOpen]);

  useEffect(() => {
    if (!open || started) return;
    const turn = runSiteBotTurn(createSiteBotContext(), "oi");
    setCtx(turn.ctx);
    setMessages(
      turn.replies.map((text) => ({ id: newId(), role: "bot" as const, text }))
    );
    setStarted(true);
  }, [open, started]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  function pushUserAndBot(userText: string) {
    const trimmed = userText.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", text: trimmed },
    ]);

    const turn = runSiteBotTurn(ctx, trimmed);
    setCtx(turn.ctx);
    setMessages((prev) => [
      ...prev,
      ...turn.replies.map((text) => ({
        id: newId(),
        role: "bot" as const,
        text,
      })),
    ]);

    if (turn.handoff) {
      setOpen(false);
      openPanel({ assunto: "equipe" });
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft;
    setDraft("");
    pushUserAndBot(text);
  }

  function closeBot() {
    setOpen(false);
  }

  function toggleBot() {
    setOpen((v) => !v);
  }

  return (
    <div className={styles.root} hidden={leadOpen || undefined}>
      {open && !leadOpen ? (
        <div
          id={panelId}
          className={styles.panel}
          role="dialog"
          aria-label="Assistente automático IPECC"
        >
          <div className={styles.header}>
            <div>
              <strong className={styles.title}>Assistente automático</strong>
              <p className={styles.subtitle}>
                Menu 1–6 · em cada tema use A / B / C
              </p>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={closeBot}
              aria-label="Fechar assistente"
            >
              ×
            </button>
          </div>

          <div className={styles.chatList} ref={listRef}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "bot" ? styles.bubbleBot : styles.bubbleUser}
              >
                {m.text.split("\n").map((line, i) => (
                  <span key={`${m.id}-${i}`}>
                    {i > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div className={styles.quickRow}>
            {getSiteBotQuickOptions(ctx.state).map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={styles.quickBtn}
                onClick={() => pushUserAndBot(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            <input
              className={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ex.: 2, A, B, menu…"
              aria-label="Mensagem para o assistente"
              autoComplete="off"
            />
            <button type="submit" className={styles.send}>
              Enviar
            </button>
          </form>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.waLink}
              onClick={() => {
                setOpen(false);
                openPanel({ assunto: "equipe" });
              }}
            >
              Preferir WhatsApp com a equipe
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={styles.fab}
        onClick={toggleBot}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Fechar assistente automático" : "Abrir assistente automático"}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12zM7 9h2v2H7V9zm4 0h2v2h-2V9zm4 0h2v2h-2V9z" />
        </svg>
      </button>
    </div>
  );
}
