"use client";

type Props = {
  open: boolean;
  embedUrl: string | null;
  signingUrl?: string | null;
  title?: string;
  onClose: () => void;
  onCompleted?: () => void;
};

/**
 * Modal com iframe do motor de assinatura (Documento).
 * O admin assina no próprio painel sem depender só do e-mail.
 */
export default function AssinarNoAdminModal({
  open,
  embedUrl,
  signingUrl,
  title = "Assinar documento",
  onClose,
  onCompleted,
}: Props) {
  if (!open) return null;

  const src = embedUrl || signingUrl || "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(15, 23, 42, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(960px, 100%)",
          maxHeight: "92vh",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid #334155",
          }}
        >
          <strong style={{ color: "#f8fafc" }}>{title}</strong>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {signingUrl ? (
              <a
                href={signingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#93c5fd",
                  fontSize: 13,
                  alignSelf: "center",
                }}
              >
                Abrir em nova aba
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => {
                onCompleted?.();
                onClose();
              }}
              style={{
                background: "#0f766e",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Concluí — atualizar
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#334155",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              Fechar
            </button>
          </div>
        </div>
        {src ? (
          <iframe
            title={title}
            src={src}
            style={{
              width: "100%",
              height: "min(78vh, 720px)",
              border: "none",
              background: "#fff",
            }}
            allow="clipboard-write"
          />
        ) : (
          <p style={{ padding: 24, color: "#fca5a5" }}>
            Link de assinatura indisponível. Verifique se o motor Documento está
            no ar e tente de novo.
          </p>
        )}
      </div>
    </div>
  );
}
