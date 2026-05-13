import { Suspense } from "react";
import EventoFormClient from "./EventoFormClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <EventoFormClient />
    </Suspense>
  );
}