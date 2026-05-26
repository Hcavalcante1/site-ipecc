"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="container" style={{ padding: "72px 0" }}>
      <div className="card" style={{ padding: 24 }}>
        <h1 className="card__title">Nao foi possivel carregar esta pagina</h1>
        <p className="card__text">
          Tente novamente em instantes. Se o problema persistir, contate a equipe da APECC.
        </p>
        {error.digest && (
          <p className="card__text">Codigo de diagnostico: {error.digest}</p>
        )}
        <button className="btn-vermais" type="button" onClick={reset}>
          Tentar novamente
        </button>
      </div>
    </section>
  );
}
