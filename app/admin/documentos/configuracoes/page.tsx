"use client";

import GestaoDocumentalShell, {
  gdCardStyle,
} from "../components/GestaoDocumentalShell";

const PROVIDERS = ["govbr"] as const;

export default function ConfiguracoesPage() {
  return (
    <GestaoDocumentalShell
      title="Configurações"
      description="Provedores de assinatura e parâmetros do módulo (servidor)."
    >
      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Provedores de assinatura
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {PROVIDERS.map((code) => (
            <li key={code}>
              <strong>{code}</strong>
              {" — stub Fase 1; OAuth2 real na Fase 4 (GOVBR_SIGNATURE_* no servidor)"}
            </li>
          ))}
        </ul>
        <p style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
          Futuros: icp_brasil, clicksign, autentique, docusign, zapsign,
          adobe_sign. O client_secret nunca deve existir no frontend.
        </p>
      </div>
    </GestaoDocumentalShell>
  );
}
