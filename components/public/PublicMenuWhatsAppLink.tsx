"use client";

import { useWhatsAppChat } from "./WhatsAppFloatingChat";

type PublicMenuWhatsAppLinkProps = {
  onNavigate?: () => void;
};

/** Item de menu que abre o pré-cadastro WhatsApp (sem sair do site). */
export default function PublicMenuWhatsAppLink({
  onNavigate,
}: PublicMenuWhatsAppLinkProps) {
  const { openPanel } = useWhatsAppChat();

  return (
    <button
      type="button"
      className="menu__link menu__link--whatsapp"
      onClick={() => {
        openPanel();
        onNavigate?.();
      }}
    >
      WhatsApp
    </button>
  );
}
