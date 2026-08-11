"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class AdminErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AdminErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            margin: "24px",
            padding: "20px 24px",
            borderRadius: 12,
            border: "1px solid rgba(239,68,68,0.35)",
            background: "rgba(127,29,29,0.15)",
            color: "#fca5a5",
          }}
        >
          <strong style={{ display: "block", marginBottom: 8 }}>
            Erro inesperado nesta página
          </strong>
          <code style={{ fontSize: 13, color: "#f87171" }}>
            {this.state.error.message}
          </code>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 14,
              display: "block",
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.4)",
              background: "transparent",
              color: "#fca5a5",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
