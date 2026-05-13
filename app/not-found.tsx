// app/not-found.tsx
export default function NotFound() {
  return (
    <div style={{ padding: "64px 0" }}>
      <div className="container">
        <h2 style={{ fontSize: "1.8rem", color: "#0b2a6b", marginBottom: 12 }}>
          Esta página não foi encontrada.
        </h2>
        <p style={{ color: "#4b5563", marginBottom: 16 }}>
          O endereço pode estar incorreto ou o conteúdo foi movido.
        </p>
        <a href="/" className="btn-cta" style={{ textDecoration: "none" }}>
          Voltar para a página inicial
        </a>
      </div>
    </div>
  );
}
