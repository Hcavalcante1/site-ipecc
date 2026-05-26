"use client";

export default function AdminErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="admin-card">
      <h1>Falha ao carregar o painel</h1>
      <p>
        O painel encontrou uma instabilidade local. Recarregue antes de repetir a operacao.
      </p>
      <button className="admin-button" type="button" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
