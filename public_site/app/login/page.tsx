"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("E-mail ou senha inválidos");
      return;
    }

    router.replace("/admin");
  }

  return (
    <>
      {/* 🔒 CSS LOCAL — APENAS PARA ESTA PÁGINA */}
      <style jsx>{`
        .login-wrapper,
        .login-wrapper h2,
        .login-wrapper p,
        .login-wrapper label {
          color: #ffffff !important;
        }

        .login-wrapper input {
          color: #000000 !important;
        }
      `}</style>

      <div
        className="login-wrapper"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #0b1220 0%, #020617 100%)",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            width: 420,
            padding: "36px 40px",
            borderRadius: 16,
            background: "linear-gradient(180deg, #020617, #0b1220)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
          }}
        >
          <h2 style={{ textAlign: "center", marginBottom: 6 }}>
            Painel Administrativo
          </h2>

          <p
            style={{
              textAlign: "center",
              opacity: 0.75,
              marginBottom: 28,
              fontSize: 14,
            }}
          >
            Acesso restrito ao sistema interno
          </p>

          {error && (
            <div
              style={{
                background: "rgba(220,38,38,0.15)",
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <label>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: 6,
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: 10,
              background: "#ffffff",
              border: "none",
              fontSize: 14,
            }}
          />

          <label>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: 6,
              marginBottom: 22,
              padding: "12px 14px",
              borderRadius: 10,
              background: "#ffffff",
              border: "none",
              fontSize: 14,
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              background: "#16a34a",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            {loading ? "Verificando acesso..." : "Entrar"}
          </button>

          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              opacity: 0.6,
              marginTop: 20,
            }}
          >
            Sistema administrativo • APECC
          </p>
        </form>
      </div>
    </>
  );
}


