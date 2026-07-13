"use client";

import { Suspense } from "react";
import AssinaturasClient from "./AssinaturasClient";

export default function AssinaturasPage() {
  return (
    <Suspense fallback={<div style={{ color: "#e5e7eb", padding: 16 }}>Carregando...</div>}>
      <AssinaturasClient />
    </Suspense>
  );
}
