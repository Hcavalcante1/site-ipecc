import { Suspense } from "react";
import NoticiaFormClient from "./NoticiaFormClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <NoticiaFormClient />
    </Suspense>
  );
}